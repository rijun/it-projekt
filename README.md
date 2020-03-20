# IT Projekt

## Requirements
For the automatic installation `python3`, `pip3`, `virtualenv`, `wget` and `git` have to be installed on the system.

In case of a manual installation the following python modules are required:
* flask
* python-dateutil
* python-dotenv

## Installation


Take note that a database with the correct schema has to be present if no database was generated on installation of if a
manual installation has been done.

### Automatic setup

You can install the IT Projekt via the following command
```
bash -c "$(wget -O- https://raw.githubusercontent.com/rijun/IT-Projekt/master/tools/install.sh)"
```
To start the IT Projekt execute the script `run_itp.sh`. Alternatively, `wsgi.py` can be invoked manually or by a production server. 

### Manual setup
The program will look for the `itp.db` database the `instance` folder, which has to be created before running the program. 
If one of the two, or both, are missing, the program will create the missing files. If the database file is missing,
the newly created database will be empty and has to be filled manually according to the given schema. Furthermore, a
`.env` file with the following content should be present in the root directory.

```
FLASK_ENV=production
SECRET_KEY=<choose a secret key>
```

To start the server, install the required modules and enter `flask run` into a terminal of your choice.

### Database schema
The sqlite3 database consists of two tables, _zaehlpunkte_ and _zaehlwerte_. [Sample database](https://github.com/rijun/IT-Projekt/releases/tag/v2.0-sqlite) 

###### zaehlpunkte
zaehler_id|kunde_name|kunde_vorname|plz    |ort
----------|----------|-------------|-------|----
TEXT      |TEXT      |TEXT         |INTEGER|TEXT

###### zaehlwerte
datum_zeit|zaehler_id|obis_180|obis_170|obis_280|obis_270
----------|----------|--------|--------|--------|--------
DATETIME  |TEXT      |REAL=0.0|REAL=0.0|REAL=0.0|REAL=0.0
