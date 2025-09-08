from flask import Flask, render_template, request, jsonify, send_from_directory
import sqlite3, os

app = Flask(__name__, static_folder='static', template_folder='templates')

def get_db():
    conn = sqlite3.connect('bookings.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/dashboard.html')
def dashboard():
    return send_from_directory('static', 'dashboard.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/api/bookings/<equipment>', methods=['GET'])
def api_get_bookings(equipment):
    db = get_db()
    rows = db.execute("SELECT * FROM bookings WHERE equipment=?", (equipment,)).fetchall()
    bookings = [dict(row) for row in rows]
    return jsonify(bookings)

@app.route('/api/bookings/<equipment>', methods=['POST'])
def api_add_booking(equipment):
    data = request.get_json()
    db = get_db()
    db.execute(
        "INSERT INTO bookings (equipment, title, start, end) VALUES (?, ?, ?, ?)",
        (equipment, data['title'], data['start'], data['end'])
    )
    db.commit()
    return jsonify({"result": "success"})

@app.route('/api/bookings/<equipment>', methods=['DELETE'])
def api_delete_booking(equipment):
    data = request.get_json()
    db = get_db()
    db.execute(
        "DELETE FROM bookings WHERE equipment=? AND title=? AND start=? AND end=?",
        (equipment, data['title'], data['start'], data['end'])
    )
    db.commit()
    return jsonify({"result": "deleted"})

def init_db():
    if not os.path.isfile('bookings.db'):
        db = get_db()
        db.execute('''CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment TEXT,
            title TEXT,
            start TEXT,
            end TEXT
        )''')
        db.commit()

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
