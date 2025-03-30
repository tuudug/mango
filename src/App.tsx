import "./App.css"; // Keep global styles if any
import { Dashboard } from "./components/Dashboard"; // Import the new Dashboard component

function App() {
  return (
    <div className="h-full w-full">
      <Dashboard /> {/* Render the Dashboard component */}
    </div>
  );
}

export default App;
