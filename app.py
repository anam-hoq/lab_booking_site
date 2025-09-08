from flask import Flask, render_template, request, jsonify, send_from_directory
import psycopg2, os

app = Flask(__name__, static_folder='static', template_folder='templates')

def get_db():
    conn = psycopg2.connect(os.environ["database_url"], sslmode='require')
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
    cur = db.cursor()
    cur.execute("SELECT title, start, \"end\" FROM bookings WHERE equipment = %s", (equipment,))
    rows = cur.fetchall()
    db.close()
    # Return list of dicts matching FullCalendar's expectation
    return jsonify([{"title": row[0], "start": row[1], "end": row[2]} for row in rows])

@app.route('/api/bookings/<equipment>', methods=['POST'])
def api_add_booking(equipment):
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO bookings (equipment, title, start, \"end\") VALUES (%s, %s, %s, %s)",
        (equipment, data['title'], data['start'], data['end'])
    )
    db.commit()
    db.close()
    return jsonify({"result": "success"})

@app.route('/api/bookings/<equipment>', methods=['DELETE'])
def api_delete_booking(equipment):
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "DELETE FROM bookings WHERE equipment=%s AND title=%s AND start=%s AND \"end\"=%s",
        (equipment, data['title'], data['start'], data['end'])
    )
    db.commit()
    db.close()
    return jsonify({"result": "deleted"})

def init_db():
    db = get_db()
    cur = db.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            equipment TEXT,
            title TEXT,
            start TEXT,
            "end" TEXT
        )
    ''')
    db.commit()
    db.close()

# Always initialize table, safe to call every time
init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
