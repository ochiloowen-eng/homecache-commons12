import { useEffect, useState } from "react";
import io from "socket.io-client";
import { API_BASE } from "../api";

const socket = io(API_BASE);

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
