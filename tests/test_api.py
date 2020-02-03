import json


def test_day_api(client):
    response = client.get("/api/day/1ESY1312000111?d=2018-11-07")
    assert response.status_code == 200
    assert response.content_type == 'application/json'
    with open("json/day.json", 'r') as f:
        sample_data = json.dumps(json.load(f), sort_keys=True)
    response_data = json.dumps(response.get_json(), sort_keys=True)
    assert response_data == sample_data


def test_interval_api(client):
    response = client.get("/api/interval/1ESY1312000111?s=2018-11-07&e=2018-11-12")
    assert response.status_code == 200
    assert response.content_type == 'application/json'
    with open("json/interval.json", 'r') as f:
        sample_data = json.dumps(json.load(f), sort_keys=True)
    response_data = json.dumps(response.get_json(), sort_keys=True)
    assert response_data == sample_data


def test_month_api(client):
    response = client.get("/api/month/1ESY1312000111?m=2018-11")
    assert response.status_code == 200
    assert response.content_type == 'application/json'
    with open("json/month.json", 'r') as f:
        sample_data = json.dumps(json.load(f), sort_keys=True)
    response_data = json.dumps(response.get_json(), sort_keys=True)
    assert response_data == sample_data


def test_year_api(client):
    response = client.get("/api/year/1ESY1312000111?y=2018")
    assert response.status_code == 200
    assert response.content_type == 'application/json'
    with open("json/year.json", 'r') as f:
        sample_data = json.dumps(json.load(f), sort_keys=True)
    response_data = json.dumps(response.get_json(), sort_keys=True)
    assert response_data == sample_data
