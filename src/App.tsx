import CodeEditor from './components/CodeEditor';
import useFileSystem from './hooks/filesystem';
import './lib/webcontainer';
function App() {
  useFileSystem();
  return (
    <div className="h-screen">
      <CodeEditor />
    </div>
  );
}

export default App;
