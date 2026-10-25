import {describe, expect, it} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BRANCH_MISSION_IDS, DURABLE_MISSION_IDS, MAIN_MISSIONS, SOLO_INITIAL_MISSION_IDS} from '../src/config/missions';
import {GUARANTEE_SPECIES, HEARTS, HOUR, SPECIES_IDS} from '../src/config/balance';
import {DECORATIONS, ownedDecorationResalePrice} from '../src/config/decorations';
import {activeMainMissions, mainProgress} from '../src/simulation/missions';
import {cumulativeLevelXp, missionClaimXp} from '../src/simulation/progression';
import {cuisineQuotaText, cuisineRemaining, heartGift, orderReadyText, recipeHint} from '../src/ui/economyFeedback';
import {emptyBuilding} from '../src/state/initial';

function advanced() {
  const s = createGame(0);
  s.progression = {totalXp:cumulativeLevelXp(15),rewardedThroughLevel:15};
  s.discovered = [...SPECIES_IDS];
  s.buildings[0].habitat!.level = 2;
  s.acquiredParcels = ['southwest','south','southeast','west'];
  s.missions.claimed = [...SOLO_INITIAL_MISSION_IDS,...BRANCH_MISSION_IDS]; s.missions.completed = [...s.missions.claimed];
  s.missions.nightOrderStarted = true;
  return s;
}
describe('economy B durable goals', () => {
  it('loads an existing v17 without awarding resources or XP, then claims each chained reward once', () => {
    const old = advanced(); delete old.missions.nightOrderStarted;
    old.buildings.push({...emptyBuilding('building-100','farm',0,32),order:{recipe: 'persil',startedAt:0,endsAt:HOUR}});old.nextId=101;
    const loaded = decodeGame(encodeGame(old)); expect(loaded.ok).toBe(true); if(!loaded.ok) throw Error(loaded.reason);
    let s = loaded.state;
    expect([s.pattes,s.grass,s.hearts,s.progression]).toEqual([old.pattes,old.grass,old.hearts,old.progression]);
    expect(s.missions.nightOrderStarted).toBe(true);
    for (const id of DURABLE_MISSION_IDS) {
      expect(activeMainMissions(s)).toEqual([id]); expect(s.missions.completed).toContain(id);
      expect(missionClaimXp('main', id)).toBe(40);
      const before=s, reward=MAIN_MISSIONS[id].reward;
      const claimed=act(s,{type:'claimMainMission',id},0);expect(claimed.ok).toBe(true);s=claimed.state;
      expect(s.progression.totalXp-before.progression.totalXp).toBe(40);
      if(reward.resource!=='none') expect(s[reward.resource]-before[reward.resource]).toBe(reward.amount);
      expect(act(s,{type:'claimMainMission',id},0)).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});
      const reloaded=decodeGame(encodeGame(s));if(!reloaded.ok)throw Error(reloaded.reason);s=reloaded.state;
    }
    expect(activeMainMissions(s)).toEqual([]);
  });
  it('checks every condition and counts all twenty-four ordinary rares, including the paid four', () => {
    const s=advanced();
    for(const id of DURABLE_MISSION_IDS){const p=mainProgress(s,id);expect(p.value,id).toBeGreaterThanOrEqual(p.target);}
    expect(mainProgress(createGame(0),'night-order').value).toBe(0);
    expect(mainProgress(s,'all-ordinary-rares').target).toBe(24);
    s.discovered=s.discovered.filter(id=>id!=='bouee');expect(mainProgress(s,'all-ordinary-rares').value).toBe(23);
    expect(GUARANTEE_SPECIES).toHaveLength(24);
    s.missions.claimed=[...SOLO_INITIAL_MISSION_IDS];expect(activeMainMissions(s)).toEqual([...BRANCH_MISSION_IDS,'level-five']);
    expect(act(s,{type:'claimMainMission',id:'level-fifteen'},0)).toMatchObject({ok:false,reason:'NOT_READY'});
  });
  it('banks a successful longer-crop launch through harvest and reload, but never a refused order', () => {
    let s=createGame(0);s.buildings.push(emptyBuilding('building-100','farm',0,32));s.nextId=101;s.progression={totalXp:cumulativeLevelXp(5),rewardedThroughLevel:5};
    s.pattes=0;expect(act(s,{type:'startOrder',id:'building-100',recipe: 'persil'},0).state.missions.nightOrderStarted).toBeUndefined();
    s.pattes=1000;const launch=act(s,{type:'startOrder',id:'building-100',recipe: 'persil'},0);expect(launch.ok).toBe(true);
    const harvest=act(launch.state,{type:'collectOrder',id:'building-100'},10*HOUR);expect(harvest.ok).toBe(true);
    const load=decodeGame(encodeGame(harvest.state));expect(load.ok&&load.state.missions.nightOrderStarted).toBe(true);
  });
});
describe('economy B feedback and prices', () => {
  it('gives only parent type hints for the twenty illustrated rares', () => {
    const hints=SPECIES_IDS.filter(id=>recipeHint(id));expect(hints).toHaveLength(20);
    for(const id of hints) expect(recipeHint(id)).toMatch(/^Indice : .+ × .+$/);
    for(const id of ['bouee','feu-glace','lunettes','perroquet','magicien','dragon'] as const) expect(recipeHint(id)).toBeNull();
    expect(hints.map(recipeHint).join(' ')).not.toMatch(/affection|%/i);
  });
  it('shows all five slots, then the unchanged tip, and renews at the canonical cycle', () => {
    let s=createGame(0);s.buildings.push(emptyBuilding('building-100','kitchen',0,32));s.nextId=101;
    expect(cuisineRemaining(s,0)).toBe(5);
    for(let left=4;left>=0;left--){const r=act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'salad'},0);expect(r.ok).toBe(true);s=r.state;expect(cuisineRemaining(s,0)).toBe(left);}
    expect(cuisineQuotaText(s,0)).toBe('Récompense complète épuisée : pourboire de 5 pattes et 1 nourriture jusqu’à demain');
    const tip=act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'chicken'},0);expect(tip.ok&&tip.cuisineReward).toMatchObject({pattes:5,grass:1,fullReward:false});
    expect(cuisineRemaining(advance(s,24*HOUR),24*HOUR)).toBe(5);
  });
  it('shows accumulated gifts, caps them at three and uses the next deadline', () => {
    const s=createGame(0), due=s.nextHeartGiftAt;
    expect(heartGift(s,due-1)).toMatchObject({gifts:0,amount:0});
    expect(heartGift(s,due)).toMatchObject({gifts:1,amount:2});
    expect(heartGift(s,due+2*HEARTS.giftInterval).text).toBe('3 cadeaux · 6 cœurs');
    const r=act(s,{type:'claimHearts'},due+8*HEARTS.giftInterval);expect(r.ok&&r.value).toBe(6);
    expect(heartGift(r.state,due+8*HEARTS.giftInterval).gifts).toBe(0);
  });
  it('preserves small prices, halves new prices and caps old refunds at their old paid price', () => {
    expect(DECORATIONS.bush.price).toBe(20);expect(DECORATIONS['honey-pot'].price).toBe(70);
    for(const [catalogId,price,legacy] of [['small-bookcase',600,160],['coconut-palm',800,130],['otter-plush',1500,200],['hanukkah-menorah',2500,150],['large-bookcase',4000,400],['robot-statue',15000,500]] as const){
      expect(DECORATIONS[catalogId].price).toBe(price);expect(ownedDecorationResalePrice({catalogId,paidPrice:price})).toBe(price/2);
      expect(ownedDecorationResalePrice({catalogId})).toBe(legacy);
      const s=createGame(0);s.decorations=[{id:'decoration-100',catalogId,location:{kind:'inventory'}}];s.nextId=101;
      const d=decodeGame(encodeGame(s));if(!d.ok)throw Error(d.reason);const sold=act(d.state,{type:'sellDecoration',id:'decoration-100'},0);
      expect(sold.ok).toBe(true);expect(sold.state.pattes-s.pattes).toBe(legacy);
    }
  });
  it('formats the night completion in local clock time',()=>{
    expect(orderReadyText(new Date(2026,9,25,6,40).getTime())).toBe('Prête vers 6 h 40');
  });
});
