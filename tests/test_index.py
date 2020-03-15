from itp.db import get_db


def test_register(client, app):
    response = client.get('/')
    assert response.status_code == 200

    with app.app_context():
        assert get_db().execute(
            "SELECT * FROM zaehlpunkte WHERE zaehler_id = '1ESY1312000111'",
        ).fetchone() is not None
