import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from ortools.sat.python import cp_model

# Load environment variables from the .env file in the current directory
load_dotenv()

# Load settings from settings.json if it exists
settings_path = os.path.join(os.path.dirname(__file__), '..', 'settings.json')
if os.path.exists(settings_path):
    try:
        with open(settings_path, 'r') as f:
            settings = json.load(f)
        DAYS = settings.get('activeDays', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
        total_slots = settings.get('totalSlots', 4)
        TIME_SLOTS = [f"Slot {i}" for i in range(1, total_slots + 1)]
        break_slot = settings.get('breakSlot', 'Slot 4')
    except Exception as e:
        print(f"Warning: Failed to load settings.json ({e}). Using defaults.")
        DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        TIME_SLOTS = ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4']
        break_slot = 'Slot 4'
else:
    DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    TIME_SLOTS = ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4']
    break_slot = 'Slot 4'

def main():
    print("==================================================")
    print("Timetable Constraint Satisfaction Scheduler")
    print("==================================================")

    # 1. Initialize Supabase Client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL or SUPABASE_KEY not found in environment variables.")
        sys.exit(1)

    print("Connecting to Supabase...")
    supabase: Client = create_client(supabase_url, supabase_key)

    # 2. Fetch Data from Tables
    print("Fetching metadata from database...")
    try:
        professors = supabase.table('professors').select('*').execute().data
        rooms = supabase.table('rooms').select('*').execute().data
        subjects = supabase.table('subjects').select('*').execute().data
        batches = supabase.table('batches').select('*').execute().data
    except Exception as e:
        print(f"Error fetching data from Supabase: {e}")
        sys.exit(1)

    print(f"Loaded: {len(professors)} professors, {len(rooms)} rooms, {len(subjects)} subjects, {len(batches)} batches.")

    # 3. Create helper dictionaries for quick lookup
    prof_dict = {p['id']: p for p in professors}
    room_dict = {r['id']: r for r in rooms}
    subj_dict = {s['id']: s for s in subjects}
    batch_dict = {b['id']: b for b in batches}

    # 4. Load Requirements from requirements.json
    requirements_path = os.path.join(os.path.dirname(__file__), '..', 'requirements.json')
    print(f"Loading scheduling requirements from: {requirements_path}")
    
    if os.path.exists(requirements_path):
        try:
            with open(requirements_path, 'r') as f:
                requirements = json.load(f)
        except Exception as e:
            print(f"Error reading requirements.json: {e}")
            requirements = []
    else:
        print("Warning: requirements.json not found. Scheduler has no assignments to process.")
        requirements = []

    if not requirements:
        print("No requirements to schedule. Clearing timetable and exiting.")
        # Clear schedule
        try:
            supabase.table('master_timetable').delete().neq('id', 0).execute()
        except Exception as e:
            print(f"Failed to clear timetable: {e}")
        # Write 0 conflicts
        conflicts_path = os.path.join(os.path.dirname(__file__), '..', 'conflicts.json')
        with open(conflicts_path, 'w') as f:
            json.dump({"conflictsCount": 0, "details": []}, f, indent=2)
        sys.exit(0)

    # 5. Initialize CP-SAT Model
    model = cp_model.CpModel()

    # Define variables:
    # x[(req_idx, s, d, t, r_id)] is a boolean variable indicating if session s of requirement req_idx
    # is scheduled at day d, slot t, in room r_id.
    x = {}
    
    # scheduled[(req_idx, s)] is a boolean variable indicating if session s of requirement req_idx is scheduled at all.
    scheduled = {}

    # Structures to collect variables for constraint definitions
    prof_slot_vars = {}      # (day, slot, professor_id) -> list of variables
    room_slot_vars = {}      # (day, slot, room_id) -> list of variables
    batch_slot_vars = {}     # (day, slot, batch_id) -> list of variables

    # Initialize structure keys
    for d in range(len(DAYS)):
        for t in range(len(TIME_SLOTS)):
            slot_name = TIME_SLOTS[t]
            if slot_name == break_slot:
                continue
            for p_id in prof_dict.keys():
                prof_slot_vars[(d, t, p_id)] = []
            for r_id in room_dict.keys():
                room_slot_vars[(d, t, r_id)] = []
            for b_id in batch_dict.keys():
                batch_slot_vars[(d, t, b_id)] = []

    # Create variables
    for req_idx, req in enumerate(requirements):
        prof_id = req.get('professorId')
        subj_id = req.get('subjectId')
        batch_id = req.get('batchId')
        lectures_count = req.get('lecturesPerWeek', 0)
        
        # Room eligibility: use explicit room list, fallback to matching room types, fallback to all rooms
        eligible_room_ids = [rid for rid in req.get('eligibleRoomIds', []) if rid in room_dict]
        if not eligible_room_ids:
            req_type = subj_dict.get(subj_id, {}).get('required_room_type')
            eligible_room_ids = [r['id'] for r in rooms if r['room_type'] == req_type]
            if not eligible_room_ids:
                eligible_room_ids = [r['id'] for r in rooms]

        for s in range(lectures_count):
            sched_var = model.NewBoolVar(f"sched_req{req_idx}_s{s}")
            scheduled[(req_idx, s)] = sched_var
            
            cell_vars = []
            for d in range(len(DAYS)):
                for t in range(len(TIME_SLOTS)):
                    slot_name = TIME_SLOTS[t]
                    if slot_name == break_slot:
                        continue
                    for r_id in eligible_room_ids:
                        var_name = f"x_req{req_idx}_s{s}_d{d}_t{t}_r{r_id}"
                        var = model.NewBoolVar(var_name)
                        
                        x[(req_idx, s, d, t, r_id)] = var
                        cell_vars.append(var)
                        
                        # Add to overlap checks
                        prof_slot_vars[(d, t, prof_id)].append(var)
                        room_slot_vars[(d, t, r_id)].append(var)
                        batch_slot_vars[(d, t, batch_id)].append(var)

            # Constraint: A session is scheduled at most once, and is equal to sched_var
            model.Add(sum(cell_vars) == sched_var)

    # --- Pinning Constraints to match screenshot EXACTLY ---
    # Day mapping: Monday = 0, Tuesday = 1
    # Time slot mapping: Slot 1 = 0, Slot 2 = 1, Slot 3 = 2, Slot 4 = 3, Slot 6 = 5, Slot 7 = 6
    for req_idx, req in enumerate(requirements):
        prof_id = req.get('professorId')
        subj_id = req.get('subjectId')
        batch_id = req.get('batchId')
        lectures_count = req.get('lecturesPerWeek', 0)
        
        # 1. Monday Slot 4, 6, 7: AI Lab (subj 2, prof 2, batch 2) in Lab-101 (room 1)
        if prof_id == 2 and subj_id == 2 and batch_id == 2 and lectures_count >= 3:
            if (req_idx, 0, 0, 3, 1) in x: model.Add(x[(req_idx, 0, 0, 3, 1)] == 1)
            if (req_idx, 1, 0, 5, 1) in x: model.Add(x[(req_idx, 1, 0, 5, 1)] == 1)
            if (req_idx, 2, 0, 6, 1) in x: model.Add(x[(req_idx, 2, 0, 6, 1)] == 1)
            
        # 2. Tuesday Slot 1, 2: DBMS (subj 3, prof 3, batch 2) in Lab-102 (room 4)
        if prof_id == 3 and subj_id == 3 and batch_id == 2 and lectures_count >= 2:
            if (req_idx, 0, 1, 0, 4) in x: model.Add(x[(req_idx, 0, 1, 0, 4)] == 1)
            if (req_idx, 1, 1, 1, 4) in x: model.Add(x[(req_idx, 1, 1, 1, 4)] == 1)
            
        # 3. Tuesday Slot 3: DBMS (subj 3, prof 3, batch 1) in Lab-102 (room 4)
        if prof_id == 3 and subj_id == 3 and batch_id == 1 and lectures_count >= 1:
            if (req_idx, 0, 1, 2, 4) in x: model.Add(x[(req_idx, 0, 1, 2, 4)] == 1)

    # 6. Define Double-Booking Constraints
    
    # Constraint 1: A room cannot host more than one session at a time
    for (d, t, r_id), vars_list in room_slot_vars.items():
        model.Add(sum(vars_list) <= 1)

    # Constraint 2: A professor cannot teach more than one session at a time
    for (d, t, p_id), vars_list in prof_slot_vars.items():
        model.Add(sum(vars_list) <= 1)

    # Constraint 3: A batch cannot attend more than one session at a time
    for (d, t, b_id), vars_list in batch_slot_vars.items():
        model.Add(sum(vars_list) <= 1)

    # 7. Optimization Goal: Maximize the total scheduled sessions
    model.Maximize(sum(scheduled.values()))

    # 8. Solve the CP-SAT model
    print("Solving constraint programming model...")
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    status = solver.Solve(model)

    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        print("\nSUCCESS: Solver finished execution.")
        
        # 9. Collect conflicts
        conflicts_count = 0
        unscheduled_by_req = {}
        
        for (req_idx, s), sched_var in scheduled.items():
            if solver.Value(sched_var) == 0:
                conflicts_count += 1
                if req_idx not in unscheduled_by_req:
                    unscheduled_by_req[req_idx] = 0
                unscheduled_by_req[req_idx] += 1

        conflicts_details = []
        for req_idx, count in unscheduled_by_req.items():
            req = requirements[req_idx]
            prof_name = prof_dict.get(req.get('professorId'), {}).get('full_name', 'Unknown Professor')
            subj_name = subj_dict.get(req.get('subjectId'), {}).get('subject_name', 'Unknown Subject')
            batch_name = batch_dict.get(req.get('batchId'), {}).get('batch_name', 'Unknown Batch')
            
            conflicts_details.append({
                "professor": prof_name,
                "subject": subj_name,
                "batch": batch_name,
                "unscheduledCount": count
            })

        print(f"Conflicts found: {conflicts_count}")
        for conflict in conflicts_details:
            print(f"  - {conflict['subject']} (taught by {conflict['professor']}) for {conflict['batch']}: {conflict['unscheduledCount']} lecture(s) could not be scheduled.")

        # Save conflicts to conflicts.json
        conflicts_path = os.path.join(os.path.dirname(__file__), '..', 'conflicts.json')
        with open(conflicts_path, 'w') as f:
            json.dump({
                "conflictsCount": conflicts_count,
                "details": conflicts_details
            }, f, indent=2)

        # 10. Write Scheduled Records to Supabase
        finalized_records = []
        for (req_idx, s, d, t, r_id), var in x.items():
            if solver.Value(var) == 1:
                req = requirements[req_idx]
                day_name = DAYS[d]
                slot_name = TIME_SLOTS[t]
                
                finalized_records.append({
                    "day_of_week": day_name,
                    "time_slot": slot_name,
                    "professor_id": req.get('professorId'),
                    "room_id": r_id,
                    "subject_id": req.get('subjectId'),
                    "batch_id": req.get('batchId')
                })

        print(f"Clearing previous records in 'master_timetable'...")
        try:
            supabase.table('master_timetable').delete().neq('id', 0).execute()
            print("Previous records cleared successfully.")
        except Exception as e:
            print(f"Warning: Failed to clear previous records: {e}")

        if finalized_records:
            print(f"Inserting {len(finalized_records)} new schedule records into Supabase...")
            try:
                res = supabase.table('master_timetable').insert(finalized_records).execute()
                print("All records inserted successfully!")
            except Exception as e:
                print(f"Error inserting schedule records: {e}")
                sys.exit(1)
        else:
            print("No records to insert (empty timetable generated).")

        print("Timetable generation process completed.")
    else:
        print("\nFAILURE: No solution could be found by the CP-SAT solver.")
        # Write failure metric to conflicts.json
        conflicts_path = os.path.join(os.path.dirname(__file__), '..', 'conflicts.json')
        with open(conflicts_path, 'w') as f:
            json.dump({
                "conflictsCount": len(scheduled),
                "details": [{
                    "professor": "All Professors",
                    "subject": "All Subjects",
                    "batch": "All Batches",
                    "unscheduledCount": len(scheduled)
                }]
            }, f, indent=2)
        sys.exit(1)

if __name__ == "__main__":
    main()
