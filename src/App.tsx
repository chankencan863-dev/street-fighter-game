import { Route, Switch } from 'wouter';
import Game from './pages/Game';

function App() {
  return (
    <Switch>
      <Route path="/" component={Game} />
      <Route path="/game" component={Game} />
      {/* Route lainnya bisa ditambahkan di sini */}
      <Route>404: Not Found</Route>
    </Switch>
  );
}

export default App;
