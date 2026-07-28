import os
import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

# Terminal formatting colors
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"

def create_text_table(sessions):
    """
    Constructs a clean, aligned plain-text table of the schedule.
    """
    headers = ["Day", "Time Slot", "Subject", "Student Batch", "Room"]
    rows = []
    
    for s in sessions:
        day = s.get("day_of_week", "")
        slot = s.get("time_slot", "")
        subject = s.get("subjects", {}).get("subject_name", "") if s.get("subjects") else ""
        batch = s.get("batches", {}).get("batch_name", "") if s.get("batches") else ""
        room = s.get("rooms", {}).get("room_number", "") if s.get("rooms") else ""
        rows.append([day, slot, subject, batch, room])
        
    # Calculate column widths
    col_widths = [len(h) for h in headers]
    for row in rows:
        for idx, val in enumerate(row):
            col_widths[idx] = max(col_widths[idx], len(str(val)))
            
    # Form border and format string
    border = "+" + "+".join(["-" * (w + 2) for w in col_widths]) + "+"
    row_fmt = "|" + "|".join([f" {{:<{w}}} " for w in col_widths]) + "|"
    
    table_lines = [border]
    table_lines.append(row_fmt.format(*headers))
    table_lines.append(border)
    for row in rows:
        table_lines.append(row_fmt.format(*row))
    table_lines.append(border)
    
    return "\n".join(table_lines)

def main():
    print("==================================================")
    print("University Timetable Automated Email Dispatcher")
    print("==================================================")

    # 1. Initialize Supabase Client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print(f"{RED}Error: SUPABASE_URL or SUPABASE_KEY not found in environment.{RESET}")
        sys.exit(1)

    print("Connecting to Supabase...")
    supabase: Client = create_client(supabase_url, supabase_key)

    # 2. Fetch Timetable Records with Joins
    print("Fetching master timetable records...")
    try:
        response = supabase.table('master_timetable').select('''
            id,
            day_of_week,
            time_slot,
            professors ( id, full_name, email, department ),
            rooms ( id, room_number, room_type ),
            subjects ( id, subject_name, required_room_type ),
            batches ( id, batch_name )
        ''').execute()
        records = response.data
    except Exception as e:
        print(f"{RED}Error fetching timetable from Supabase: {e}{RESET}")
        sys.exit(1)

    if not records:
        print(f"{YELLOW}Warning: No schedule records found in master_timetable.{RESET}")
        sys.exit(0)

    print(f"Retrieved {len(records)} timetable records.")

    # 3. Group Schedule Records by Professor
    grouped_schedules = {}
    for record in records:
        prof = record.get('professors')
        if not prof:
            continue
        prof_email = prof.get('email')
        if not prof_email:
            continue
            
        if prof_email not in grouped_schedules:
            grouped_schedules[prof_email] = {
                'professor': prof,
                'sessions': []
            }
        grouped_schedules[prof_email]['sessions'].append(record)

    print(f"Grouped records for {len(grouped_schedules)} professors.")

    # 4. Load SMTP Credentials
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
        
    smtp_email = os.environ.get("SMTP_EMAIL", "your-email@example.com")
    smtp_password = os.environ.get("SMTP_PASSWORD", "your-app-password")

    # Check if we are running in mock mode due to placeholders
    is_mock_mode = (
        smtp_email == "your-email@example.com" or 
        smtp_password == "your-app-password" or
        not smtp_email or
        not smtp_password
    )

    if is_mock_mode:
        print(f"\n{YELLOW}⚠️  Notice: Placeholder SMTP credentials detected. The dispatcher will run in [MOCK MODE].{RESET}")
        print(f"{YELLOW}Draft emails will be generated and printed to the terminal instead of sending.{RESET}\n")
    else:
        print(f"\nSMTP Server: {smtp_server}:{smtp_port}")
        print(f"Sender Address: {smtp_email}\n")

    # 5. Dispatch Loop
    for email_addr, data in grouped_schedules.items():
        prof = data['professor']
        sessions = data['sessions']
        prof_name = prof.get('full_name', 'Faculty Member')

        # Formulate Email Body
        subject = f"Official Timetable Schedule Notification - {prof_name}"
        text_table = create_text_table(sessions)
        
        email_body = f"""Dear {prof_name},

This is an automated notification containing your finalized teaching timetable schedule for the upcoming academic week.

Below are your assigned sessions:

{text_table}

Please note:
- All classes are scheduled to begin on time.
- If you require any rescheduling or find any discrepancy, please contact the Academic Coordination office immediately.

Best regards,
Academic Administration Department
University Timetable System
"""

        # Construct MIME Message
        msg = MIMEMultipart()
        msg['From'] = smtp_email
        msg['To'] = email_addr
        msg['Subject'] = subject
        msg.attach(MIMEText(email_body, 'plain'))

        # 6. Execute Dispatch
        if is_mock_mode:
            # Print Draft to Console
            print(f"{BLUE}=================================================={RESET}")
            print(f"{BOLD}DRAFT EMAIL TO: {prof_name} <{email_addr}>{RESET}")
            print(f"{BOLD}SUBJECT: {subject}{RESET}")
            print(f"--------------------------------------------------")
            print(email_body)
            print(f"{BLUE}=================================================={RESET}")
            # Log green success as requested for the simulator
            print(f"{GREEN}✔ [MOCK] Successfully dispatched schedule to {prof_name} ({email_addr}){RESET}\n")
        else:
            try:
                # Actual SMTP Dispatch
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, email_addr, msg.as_string())
                server.quit()
                
                print(f"{GREEN}✔ Successfully dispatched schedule email to {prof_name} ({email_addr}){RESET}")
            except Exception as e:
                print(f"{RED}✘ Failed to send email to {prof_name} ({email_addr}): {e}{RESET}")

    print("\nEmail dispatch process completed.")

if __name__ == "__main__":
    main()
