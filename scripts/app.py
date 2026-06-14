import sys
from pathlib import Path

# Add project root to sys.path to ensure backend package can be imported
# Path(__file__) is project_root/scripts/app.py
root_dir = Path(__file__).resolve().parents[1]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.main import main


if __name__ == "__main__":
    main()
