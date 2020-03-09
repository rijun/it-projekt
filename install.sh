#!/bin/bash

# Random string: head /dev/urandom | tr -dc A-Za-z0-9 | head -c 24 ; echo ''
# From: https://unix.stackexchange.com/questions/230673/how-to-generate-a-random-string

command_exists() {
  command -v "$@" >/dev/null 2>&1
}

setup_modules() {
  printf "Install in a virtual environment? [Y/n] "
  read -r VIRTUAL
  case "$VIRTUAL" in
  y* | Y* | "")
    if [ -f venv ] || [ -h venv ]; then
      echo "Virtual environment already present, using that one."
    else
      printf "Creating virtual environment...\n"
      python3 -m venv venv
    fi
    VENV=true
    ;;
  n* | N*)
    printf "Using system python...\n"
    VENV=false
    ;;
  *)
    printf "Invalid choice. Aborting."
    return
    ;;
  esac

  # Get pip3 path
  if [ "$VENV" = true ]; then
    PIP_PATH=venv/bin/pip3
  else
    PIP_PATH=pip3
  fi
  echo
  printf "Install as a module? [Y/n] "
  read -r PROMPT
  printf "Installing IT-Projekt...\n"
  case "$PROMPT" in
  y* | Y* | "")
    $PIP_PATH install .
    MODULE=true
    ;;
  n* | N*)
    $PIP_PATH -f requirements.txt
    MODULE=false
    ;;
  *) printf "%s" "Invalid choice. Aborting." return ;;
  esac

  echo "Installation successful!"
}

setup_itp() {
  if [ "$VENV" = true ]; then
    cat >run_itp.sh <<EOF
#!/bin/bash
source venv/bin/activate
waitress-serve --call "itp:create_app"
deactivate
EOF
  else
    cat >run_itp.sh <<EOF
#!/bin/bash
waitress-serve --call "itp:create_app"
EOF
  fi

  chmod +x run_itp.sh

  printf "Create empty database? [Y/n] "
  read -r PROMPT
  case "$PROMPT" in
  y* | Y* | "")
    if [ "$VENV" = true ]; then
      source venv/bin/activate
      flask init-db
      deactivate
      if [ "$MODULE" = true ]; then
        printf "Database created in %s\n" "venv/var/itp-instance/"
      else
        printf "Database created in %s\n" "instance/"
      fi
    else
      flask init-db
      if [ "$MODULE" = true ]; then
        printf "Database created in %s\n" "venv/var/itp-instance/"
      else
        printf "Database created in %s\n" "instance/"
      fi
    fi
    ;;
  n* | N*)
  ;;
  *) echo "Invalid choice. Aborting." return ;;
  esac
}

main() {
  if ! command_exists python3; then
    printf "%s" "python3 is not installed. Please install python3 first."
    exit 1
  fi
  if ! command_exists pip3; then
    printf "%s" "pip3 is not installed. Please install pip3 first."
    exit 1
  fi
  setup_modules
  setup_itp

}

main "$@"
