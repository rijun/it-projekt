# IT Projekt

## Requirements
For the automatic installation `python3`, `pip3`, `wget` and `git` have to be installed on the system.

In case of a manual installation the following python modules are required:
* flask
* python-dateutil
* python-dotenv

## Setup

##### New version:

You can install the IT-Projekt via the following command
```
bash -c "$(wget -O- https://raw.githubusercontent.com/rijun/IT-Projekt/develop/install.sh)"
```

##### Old version:
The program will look for the `itp.db` database the `instance` folder, which has to be created before running the program. 
If one of the two, or both, are missing, the program will create the missing files. If the database file is missing,
the newly created database will be empty and has to be filled manually according to the given schema.

## Running the Server

##### New version:
Execute the script `run_itp.sh`. Alternatively, `wsgi.py` can be invoked manually or by a production server. 

##### Old version:
To start the server, install the required modules and enter `flask run` into a terminal of your choice.
