import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    socket.on("new_memory", (data) => {
      setActivities((prev) => [data, ...prev]);
    });
  }, []);

  return (
    <div>
      <h3>Recent Activity</h3>
      <ul>
        {activities.map((a, i) => (
          <li key={i}>{a.user} {a.action}</li>
        ))}
      </ul>
    </div>
  );
}
