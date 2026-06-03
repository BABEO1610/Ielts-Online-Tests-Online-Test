import json
import os

transcript_path = r'C:\Users\ADMIN\.gemini\antigravity-ide\brain\7b916c04-0fd2-40d7-8c3d-bafefef56feb\.system_generated\logs\transcript.jsonl'
target_file = r'c:\Users\ADMIN\OneDrive\Desktop\WorkSpace\Kì 5\ielts-elearning-platform\.sdd\specs\feat-auth-and-users\PLAN.md'

content = ""
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call.get('name') == 'write_to_file' and 'PLAN.md' in call['args'].get('TargetFile', ''):
                        content = call['args'].get('CodeContent', '')
        except Exception as e:
            pass

if content:
    with open(target_file, 'w', encoding='utf-8') as out:
        out.write(content.strip('"').replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"'))
    print('Restored PLAN.md')
else:
    print('PLAN.md not found in transcript')
