import pytest
from flask import g, session
from itp.db import get_db


def test_register(client, app):
    response = client.get('/')
    assert response.status_code == 200
    assert b"ESY1312000111" in response.data
    assert b"Max Mustermann" in response.data
    assert b"12345, Hagen" in response.data
    assert b"Min: 2018 - 01 - 01" in response.data
    assert b"Max: 2018 - 12 - 31" in response.data

    with app.app_context():
        assert get_db().execute(
            "SELECT * FROM zaehlpunkte WHERE zaehler_id = '1ESY1312000111'",
        ).fetchone() is not None
