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

    # 4. Map subjects to valid rooms based on required_room_type
    subject_rooms = {}
    for subj in subjects:
        req_type = subj['required_room_type']
        matching_rooms = [r['id'] for r in rooms if r['room_type'] == req_type]
        subject_rooms[subj['id']] = matching_rooms
        print(f"Subject '{subj['subject_name']}' requires '{req_type}' -> Valid rooms: {[room_dict[r_id]['room_number'] for r_id in matching_rooms]}")

    # 5. Map subjects to qualified professors based on their department
    subject_professors = {}
    for subj in subjects:
        qualified = []
        for prof in professors:
            # Logic: Prof Sneha Verma is AI/ML -> teaches AI Lab (Subject 2)
            # Dr. Sharma and Dr. Kumar are Computer Applications/Engineering -> teach DS and DBMS (Subjects 1 and 3)
            if subj['id'] == 2:
                if 'AI' in prof['department']:
                    qualified.append(prof['id'])
            else:  # Subjects 1 and 3
                if 'Computer' in prof['department'] or 'Engineering' in prof['department']:
                    qualified.append(prof['id'])
        
        subject_professors[subj['id']] = qualified
        print(f"Subject '{subj['subject_name']}' -> Qualified professors: {[prof_dict[p_id]['full_name'] for p_id in qualified]}")

    # 6. Define the Curriculum/Lectures to schedule
    # Format: (batch_id, subject_id, sessions_per_week)
    # We want to distribute lessons across the week for each student batch
    curriculum = [
        # BCA 1st Year (Batch 1)
        (1, 1, 3),  # 3 sessions of Data Structures in C++
        (1, 3, 3),  # 3 sessions of DBMS
        
        # BCA 2nd Year (AI/ML) (Batch 2)
        (2, 1, 2),  # 2 sessions of Data Structures in C++
        (2, 2, 3),  # 3 sessions of AI & Neural Networks Lab
        (2, 3, 2),  # 2 sessions of DBMS
    ]

    # Generate a list of individual sessions to schedule
    # A session is: (batch_id, subject_id, session_index)
    sessions_to_schedule = []
    for batch_id, subject_id, count in curriculum:
        for i in range(count):
            sessions_to_schedule.append((batch_id, subject_id, i))

    print(f"\nTotal individual sessions to schedule: {len(sessions_to_schedule)}")

    # 7. Initialize CP-SAT Model
    model = cp_model.CpModel()

    # Define variables: x[session, day, slot, room, professor] is a boolean variable
    # which is True if the session is scheduled at that specific day, slot, room, and professor.
    x = {}
    
    # Structures to collect variables for constraint definitions
    session_vars = {}        # (batch_id, subject_id, session_index) -> list of variables
    room_slot_vars = {}      # (day, slot, room_id) -> list of variables
    prof_slot_vars = {}      # (day, slot, professor_id) -> list of variables
    batch_slot_vars = {}     # (day, slot, batch_id) -> list of variables

    # Initialize structure keys
    for session in sessions_to_schedule:
        session_vars[session] = []

    for d in range(len(DAYS)):
        for t in range(len(TIME_SLOTS)):
            for r_id in room_dict.keys():
                room_slot_vars[(d, t, r_id)] = []
            for p_id in prof_dict.keys():
                prof_slot_vars[(d, t, p_id)] = []
            for b_id in batch_dict.keys():
                batch_slot_vars[(d, t, b_id)] = []

    # Create variables
    for session in sessions_to_schedule:
        batch_id, subject_id, session_idx = session
        
        valid_rooms = subject_rooms.get(subject_id, [])
        qualified_profs = subject_professors.get(subject_id, [])

        if not valid_rooms:
            print(f"Error: No matching rooms for subject {subj_dict[subject_id]['subject_name']}.")
            sys.exit(1)
        if not qualified_profs:
            print(f"Error: No qualified professors for subject {subj_dict[subject_id]['subject_name']}.")
            sys.exit(1)

        for d in range(len(DAYS)):
            for t in range(len(TIME_SLOTS)):
                slot_name = TIME_SLOTS[t]
                if slot_name == break_slot:
                    continue
                for r_id in valid_rooms:
                    for p_id in qualified_profs:
                        # Create unique boolean variable
                        var_name = f"x_b{batch_id}_s{subject_id}_idx{session_idx}_d{d}_t{t}_r{r_id}_p{p_id}"
                        var = model.NewBoolVar(var_name)
                        
                        x[(session, d, t, r_id, p_id)] = var
                        session_vars[session].append(var)
                        room_slot_vars[(d, t, r_id)].append(var)
                        prof_slot_vars[(d, t, p_id)].append(var)
                        batch_slot_vars[(d, t, batch_id)].append(var)

    # 8. Define Constraints
    
    # Constraint 1: Each individual session must be scheduled EXACTLY once
    for session in sessions_to_schedule:
        model.Add(sum(session_vars[session]) == 1)

    # Constraint 2: A room cannot host more than one session at a time
    for d in range(len(DAYS)):
        for t in range(len(TIME_SLOTS)):
            for r_id in room_dict.keys():
                model.Add(sum(room_slot_vars[(d, t, r_id)]) <= 1)

    # Constraint 3: A professor cannot teach more than one session at a time
    for d in range(len(DAYS)):
        for t in range(len(TIME_SLOTS)):
            for p_id in prof_dict.keys():
                model.Add(sum(prof_slot_vars[(d, t, p_id)]) <= 1)

    # Constraint 4: A batch cannot attend more than one session at a time
    for d in range(len(DAYS)):
        for t in range(len(TIME_SLOTS)):
            for b_id in batch_dict.keys():
                model.Add(sum(batch_slot_vars[(d, t, b_id)]) <= 1)

    # 9. Solve the CP-SAT model
    print("Solving constraint programming model...")
    solver = cp_model.CpSolver()
    
    # Adjust solver parameters if needed (e.g. timeout of 10s)
    solver.parameters.max_time_in_seconds = 10.0
    status = solver.Solve(model)

    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        print("\nSUCCESS: A clash-free timetable schedule was found!")
        
        # Collect finalized schedule records
        finalized_records = []
        
        print("\nFinalized Timetable Schedule Layout:")
        print("------------------------------------------------------------------------------------------------")
        print(f"{'Day':<10} | {'Time Slot':<8} | {'Batch':<22} | {'Subject':<30} | {'Professor':<20} | {'Room':<8}")
        print("------------------------------------------------------------------------------------------------")
        
        for (session, d, t, r_id, p_id), var in x.items():
            if solver.Value(var) == 1:
                batch_id, subject_id, _ = session
                
                day_name = DAYS[d]
                slot_name = TIME_SLOTS[t]
                batch_name = batch_dict[batch_id]['batch_name']
                subject_name = subj_dict[subject_id]['subject_name']
                prof_name = prof_dict[p_id]['full_name']
                room_number = room_dict[r_id]['room_number']
                
                print(f"{day_name:<10} | {slot_name:<8} | {batch_name:<22} | {subject_name:<30} | {prof_name:<20} | {room_number:<8}")
                
                # Append database record structure
                finalized_records.append({
                    "day_of_week": day_name,
                    "time_slot": slot_name,
                    "professor_id": p_id,
                    "room_id": r_id,
                    "subject_id": subject_id,
                    "batch_id": batch_id
                })

        print("------------------------------------------------------------------------------------------------")

        # 10. Insert Schedule Records into Supabase
        print(f"\nClearing previous records in 'master_timetable'...")
        try:
            # Delete all existing rows
            supabase.table('master_timetable').delete().neq('id', 0).execute()
            print("Previous records cleared successfully.")
        except Exception as e:
            print(f"Warning: Failed to clear previous records: {e}")

        print(f"Inserting {len(finalized_records)} new schedule records into Supabase...")
        try:
            res = supabase.table('master_timetable').insert(finalized_records).execute()
            print("All records inserted successfully!")
            print("Timetable generation process completed successfully.")
        except Exception as e:
            print(f"Error inserting schedule records: {e}")
            sys.exit(1)

    else:
        print("\nFAILURE: No valid timetable schedule could be found under current constraints.")
        sys.exit(1)

if __name__ == "__main__":
    main()
