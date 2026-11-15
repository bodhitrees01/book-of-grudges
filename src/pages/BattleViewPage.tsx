import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import type { useArmyStore } from '../store/armyStore';
import { Datasheet } from '../components/Datasheet';
import { FactionRules } from '../components/FactionRules';
import { DetachmentRules } from '../components/DetachmentRules';
import type { AbilityEffect } from '../types';
import { getAttachableLeaders } from '../utils/leaderAttach';

interface Props {
  store: ReturnType<typeof useArmyStore>;
}

export function BattleViewPage({ store }: Props) {
  const { armyId } = useParams<{ armyId: string }>();
  const navigate = useNavigate();

  const army = store.armies.find((a) => a.id === armyId);

  if (!army) {
    return (
      <div className="page">
        <p>Army not found.</p>
        <button className="btn-ghost" onClick={() => navigate('/')}>Back</button>
      </div>
    );
  }

  // IDs of leaders currently attached to any unit — these are hidden from the top-level list
  const attachedLeaderIdSet = new Set(army.units.flatMap((u) => u.attachedLeaderIds));

  // Top-level units: non-leaders, plus any leaders that haven't been attached yet
  const topLevelUnits = army.units.filter((u) => !attachedLeaderIdSet.has(u.id));

  const handleAttachLeader = (bodyguardId: string, leaderId: string) => {
    const bodyguard = army.units.find((u) => u.id === bodyguardId);
    if (!bodyguard) return;
    if (bodyguard.attachedLeaderIds.includes(leaderId)) return;
    store.updateUnit(army.id, bodyguardId, {
      attachedLeaderIds: [...bodyguard.attachedLeaderIds, leaderId],
    });
  };

  const handleDetachLeader = (bodyguardId: string, leaderId: string) => {
    const bodyguard = army.units.find((u) => u.id === bodyguardId);
    if (!bodyguard) return;
    store.updateUnit(army.id, bodyguardId, {
      attachedLeaderIds: bodyguard.attachedLeaderIds.filter((id) => id !== leaderId),
    });
  };

  return (
    <div className="page page-battle">
      <div className="page-header">
        <button className="btn-icon" onClick={() => navigate(`/army/${army.id}`)}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>{army.name}</h1>
          <p className="subtitle">{army.faction} · {army.points} pts</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate(`/army/${army.id}`)}>
          <Edit size={14} /> Edit Army
        </button>
      </div>

      <FactionRules faction={army.faction} />
      {army.detachments?.length > 0 && (
        <DetachmentRules detachments={army.detachments} />
      )}

      <div className="battle-datasheets">
        {topLevelUnits.length === 0 && (
          <div className="empty-state">
            <p>No units in this army. Add units in the Army Editor.</p>
          </div>
        )}
        {topLevelUnits.map((armyUnit) => {
          const attachableLeaders = armyUnit.unitData.isLeader
            ? []
            : getAttachableLeaders(army.units, armyUnit);

          return (
            <Datasheet
              key={armyUnit.id}
              armyUnit={armyUnit}
              army={army}
              isBattle
              attachableLeaders={attachableLeaders}
              onAttachLeader={(leaderId) => handleAttachLeader(armyUnit.id, leaderId)}
              onDetachLeader={(leaderId) => handleDetachLeader(armyUnit.id, leaderId)}
              onAddAbility={(ability: Omit<AbilityEffect, 'id'>) =>
                store.addAbility(army.id, armyUnit.id, ability)
              }
              onRemoveAbility={(abilityId: string) =>
                store.removeAbility(army.id, armyUnit.id, abilityId)
              }
            />
          );
        })}
      </div>
    </div>
  );
}
