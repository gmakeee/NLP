import os

def collect_files(root_dir, output_file, skip_dirs=['env', '.venv', 'venv', '.git', '__pycache__', 'node_modules', '.next', 'out'], skip_files=['project.md', 'collect_project.py']):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(root_dir):
            # Filtering directories to skip
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            
            for file in files:
                if file in skip_files:
                    continue
                
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, root_dir)
                
                try:
                    # Try reading as text
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                    outfile.write(f"# File: {rel_path}\n")
                    # Detect extension for markdown code blocks
                    ext = os.path.splitext(file)[1].lstrip('.')
                    outfile.write(f"```{ext}\n")
                    outfile.write(content)
                    if not content.endswith('\n'):
                        outfile.write('\n')
                    outfile.write("```\n\n")
                    print(f"Added: {rel_path}")
                except (UnicodeDecodeError, PermissionError):
                    # Skip binary files or restricted files
                    print(f"Skipped (binary or error): {rel_path}")
                except Exception as e:
                    print(f"Error processing {rel_path}: {e}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    # The user asked for "папке Lena", assuming the script runs in the root of Lena
    output_path = "project.md"
    print(f"Collecting files from {current_dir} into {output_path}...")
    collect_files(current_dir, output_path)
    print("Done!")
