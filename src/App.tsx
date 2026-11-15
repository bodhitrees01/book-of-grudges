import { useEffect } from 'react';
import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import { useArmyStore } from './store/armyStore';
import { loadVotannUnits } from './api/openHammer';
import { loadEnhancements } from './data/enhancements';
import { ArmyListPage } from './pages/ArmyListPage';
import { ArmyEditorPage } from './pages/ArmyEditorPage';
import { BattleViewPage } from './pages/BattleViewPage';

export default function App() {
  const store = useArmyStore();

  // On every load, refresh stored unitData with latest weapons/abilities from units.json
  // and load enhancement descriptions from enhancements.json
  useEffect(() => {
    loadVotannUnits().then(({ units }) => {
      if (units.length) store.refreshUnitData(units);
    });
    loadEnhancements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ArmyListPage store={store} />} />
        <Route path="/army/:armyId" element={<ArmyEditorPage store={store} />} />
        <Route path="/battle/:armyId" element={<BattleViewPage store={store} />} />
      </Routes>
    </BrowserRouter>
  );
}
