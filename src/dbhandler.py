import sqlite3


class DatabaseHandler:
    def __init__(self):
        self.con = sqlite3.connect('itp.db', check_same_thread=False)

    def select(self, query, *args):
        res = []
        for row in self.con.execute(query, args):
            res.append(row)
        return res if len(res) > 1 else res[0][0]
