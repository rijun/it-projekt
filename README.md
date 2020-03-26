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

Install the required packages with `pip3 install -r requirements.txt`.

Afterwards, create a `.env` file in the top level directory with the following content:

```
FLASK_ENV=production
SECRET_KEY=<choose a secret key>
```

The program will look for the `itp.db` database the `instance` folder, which has to be present before running the program. 
If one of the two, or both, are missing, the program will create the missing files. Be aware that the 
the newly created sqlite file will be empty and the required database structure has to be created according to the schema documented below.
The structure generation can be done by running `itp/schema.sql` in `sqlite3` or by executing `flask init-db`.

To start the server enter `python3 wsgi.py` into a terminal of your choice.

Hint: If the locale `de_DE.utf8` is not present the default system locale will be used.

### Database schema
The sqlite3 database consists of two tables, _zaehlpunkte_ and _zaehlwerte_. A [sample database](https://github.com/rijun/IT-Projekt/releases/tag/v2.0-sqlite) 
filled with fictional values is provided.

###### zaehlpunkte
zaehler_id|kunde_name|kunde_vorname|plz    |ort
----------|----------|-------------|-------|----
TEXT      |TEXT      |TEXT         |INTEGER|TEXT

###### zaehlwerte
datum_zeit|zaehler_id|obis_180|obis_170|obis_280|obis_270
----------|----------|--------|--------|--------|--------
DATETIME  |TEXT      |REAL=0.0|REAL=0.0|REAL=0.0|REAL=0.0
