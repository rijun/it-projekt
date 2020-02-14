# IT Projekt

## Requirements
The following python modules are necessary:
* flask
* python-dateutil

## Setup
The program will look for the `itp.db` database the `instance` folder, which has to be created before running the program. 
If one of the two, or both, are missing, the program will create the missing files. If the database file is missing,
the newly created database will be empty and has to be filled manually according to the given schema.

## Running the Server
To start the server, install the required modules and enter `flask run` into a terminal of your choice.
