#!/bin/bash

# Random string: head /dev/urandom | tr -dc A-Za-z0-9 | head -c 24 ; echo ''
# From: https://unix.stackexchange.com/questions/230673/how-to-generate-a-random-string

command_exists() {
  command -v "$@" >/dev/null 2>&1
}

install_itp() {
  if [ -d venv ]; then
    echo "Virtual environment already present, using that one."
  else
    echo "Creating virtual environment..."
    python3 -m venv venv
  fi

  echo "Installing IT-Projekt..."
  venv/bin/pip3 install -q -r requirements.txt

  echo "Generating secret key..."
  SECRET_KEY=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 24 ; echo '')
  echo "Secret key: $SECRET_KEY"

  # Create .env file
  cat > .env <<EOF
FLASK_ENV=production
SECRET_KEY=$SECRET_KEY
EOF

  # Create run_itp.sh script
  cat > run_itp.sh <<EOF
#!/bin/bash
source venv/bin/activate
python3 wsgi.py
deactivate
EOF
  chmod +x run_itp.sh

  echo "Installation completed!"
}

init_itp() {
  printf "Create empty database? [Y/n] "
  read -r PROMPT
  case "$PROMPT" in
  y* | Y* | "")
    source venv/bin/activate
    export FLASK_APP=itp/__init__.py
    flask init-db
    deactivate
    ;;
  n* | N*)
    echo "Database has to be present in the instance/ folder."
    ;;
  *)
    echo "Invalid choice. Aborting."
    return
    ;;
  esac
}

main() {
  if ! command_exists git; then
    error "git is not installed. Please install git first."
    exit 1
  fi

  # Check if Python3 is installed
  if ! command_exists python3; then
    error "python3 is not installed. Please install python3 first."
    exit 1
  fi

  # Check if Pip3 is installed
  if ! command_exists pip3; then
    error "pip3 is not installed. Please install pip3 first."
    exit 1
  fi

  git clone https://github.com/rijun/it-projekt
  cd it-projekt || exit
  # Only for development
  git checkout develop

  install_itp
  init_itp
}

main
