from flask import Flask, request
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route("/add_memory", methods=["POST"])
def add_memory():
    data = request.json
    # Save memory logic here...
    socketio.emit("new_memory", {"user": data["user"], "action": data["action"]})
    return {"status": "ok"}

if __name__ == "__main__":
    socketio.run(app, port=4000)

@app.route("/api/upload", methods=["POST"])
def upload_file():
    file = request.files["file"]
    file.save(f"./uploads/{file.filename}")
    return {"status": "uploaded"}
