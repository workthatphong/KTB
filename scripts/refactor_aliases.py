import os
import re

src_dir = '/workspaces/KTB/frontend/src'

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    changed = False
    new_lines = []
    
    for line in lines:
        if 'import ' in line and ' from ' in line:
            match = re.search(r'from [\'"]([^\'"]+)[\'"]', line)
            if match:
                import_path = match.group(1)
                # Only replace parent directory traversals (../../)
                if import_path.startswith('..'):
                    file_dir = os.path.dirname(filepath)
                    abs_import_path = os.path.normpath(os.path.join(file_dir, import_path))
                    
                    if abs_import_path.startswith(src_dir):
                        rel_to_src = os.path.relpath(abs_import_path, src_dir)
                        new_import = '@/' + rel_to_src
                        new_import = new_import.replace('\\', '/')
                        
                        line = line.replace("'" + import_path + "'", "'" + new_import + "'")
                        line = line.replace('"' + import_path + '"', '"' + new_import + '"')
                        changed = True
        new_lines.append(line)
        
    if changed:
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f"Updated: {os.path.relpath(filepath, src_dir)}")
        return True
    return False

updated_count = 0
for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            if process_file(os.path.join(root, file)):
                updated_count += 1

print(f"Total files updated: {updated_count}")
