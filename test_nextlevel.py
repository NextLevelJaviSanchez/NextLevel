import sys,unittest,subprocess,re,ast
from pathlib import Path
R=Path(__file__).resolve().parent
sys.path.insert(0,str(R))
from nextlevel_metrics import summarize_games
from sync_cabb_supabase import procesar_boxscore,extraer_partido_ids,parse_minutes,parse_bool,resolve_player_id,sync_stats_seasons
import os
NODE=os.environ.get('NEXTLEVEL_NODE','node')

class Regression(unittest.TestCase):
    def test_valuation_ranking_and_update_timestamp(self):
        script="""
const assert=require('node:assert/strict');const {teamRanking}=require('./nextlevel_profile_extras.js');const {latestUpdate}=require('./nextlevel_performance.js');
const r=teamRanking([{available:true,players:[{name:'A',val:-2},{name:'B',val:0},{name:'C',val:null}]},{available:true,players:[{name:'A',val:4},{name:'B',val:0},{name:'C',val:20}]}],'val');
assert.equal(r.rows[0].name,'A');assert.equal(r.rows[0].avg,1);assert.equal(r.rows[1].avg,0);assert.equal(r.excluded,1);
assert.equal(latestUpdate([{updated_at:'2026-10-06T20:00:00Z'},{synced_at:'2026-10-07T03:22:00Z'},{updated_at:'bad'}]),'2026-10-07T03:22:00Z');assert.equal(latestUpdate([{}]),null);
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)
        extras=(R/'nextlevel_profile_extras.js').read_text(encoding='utf-8')
        self.assertIn("[['val','Valoración',false],['pts','Puntos',false]",extras)

    def test_team_discovery_excludes_other_clubs(self):
        import sync_cabb_supabase as sync
        from unittest.mock import patch
        class Client:
            def buscar_equipos(self,text,skip):
                return [dict(Id='correct',Nombre='CLUB SOCIAL Y DEPORTIVO BERAZATEGUI',Categoria='INFANTILES FEMENINO',Temporada='2026',Delegacion='FEMENINA METROPOLITANA',Competicion='FORMATIVAS 2026'),dict(Id='wrong',Nombre='CLUB VECINAL LA UNION',Categoria='INFANTILES FEMENINO',Temporada='2026',Delegacion='FEMENINA METROPOLITANA',Competicion='FORMATIVAS 2026')]
        with patch.object(sync,'TOURNAMENT','AFMB'):
            self.assertEqual(sync.find_equipo(Client()),'correct')

    def test_coach_workspace_saves_and_retains_failed_draft(self):
        script=r"""
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const nodes=[];class Node{constructor(tag){this.tag=tag;this.style={};this.children=[];this.events={};this.value='';nodes.push(this);}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}setAttribute(){}addEventListener(k,f){this.events[k]=f;}focus(){}}
const cache=new Map(),writes=[];let fail=false;
const client={auth:{async getUser(){return {data:{user:{id:'test'}},error:null};}},from(table){return {pattern:'',select(){return this;},eq(){return this;},like(k,v){this.pattern=v;return this;},order(){return this;},async range(){return {data:table==='player_data' && this.pattern.startsWith('plan_progress') ? [{module:'plan_progress_v1:practice1',data:{id:'practice1',date:'2026-10-06',areas:['Tiro'],success:'bien',createdAt:'2026-10-06'}}] : [],error:null};},async maybeSingle(){return {data:{data:{obs:'original',fecha:'2026-10-05'}},error:null};},async upsert(row){writes.push(row);return {error:fail?{message:'offline'}:null};}};}};
const context={document:{createElement:t=>new Node(t)},localStorage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)},window:{},Intl,Date,crypto:require('node:crypto').webcrypto};vm.createContext(context);vm.runInContext(fs.readFileSync('nextlevel_coach_workspace.js','utf8'),context);
(async()=>{
const host=new Node('root');await context.window.NextLevelCoachWorkspace.mount({host,client,playerId:'test-only',mode:'player'});
const form=nodes.find(n=>n.tag==='form'),body=nodes.find(n=>n.tag==='textarea'),role=nodes.find(n=>n.tag==='select');role.value='family';body.value='Mi consulta';await form.events.submit({preventDefault(){}});
assert.equal(writes[0].data.authorRole,'family');assert.equal(body.value,'');assert.ok(writes[0].module.startsWith('coach_conversation_v1:'));
fail=true;body.value='Conservar borrador';await form.events.submit({preventDefault(){}});assert.equal(body.value,'Conservar borrador');assert.equal(JSON.parse(cache.get('nl_coach_draft_test-only_player')).body,'Conservar borrador');
fail=false;const coachHost=new Node('root');await context.window.NextLevelCoachWorkspace.mount({host:coachHost,client,playerId:'test-only',mode:'coach'});
const obs=nodes.findLast(n=>n.tag==='label' && n.textContent==='Observaciones').children[0];assert.equal(obs.value,'original');obs.value='Nueva devolución';obs.events.input();
const evaluationForm=nodes.findLast(n=>n.tag==='form');await evaluationForm.events.submit({preventDefault(){}});
assert.equal(writes.at(-1).module,'coach_eval_v1');assert.equal(writes.at(-1).data.obs,'Nueva devolución');assert.ok(writes.at(-1).data.fecha);
})().catch(e=>{console.error(e);process.exitCode=1;});
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)

    def test_coach_conversation_roles_and_history(self):
        script="""
const assert=require('node:assert/strict');const {makeMessage,timeline}=require('./nextlevel_coach_workspace.js');
for(const role of ['coach','player','family']){const m=makeMessage({body:' hola ',role,name:' Mamá ',practiceId:'session1'},'new1','2026-10-06T12:00:00Z');assert.equal(m.body,'hola');assert.equal(m.authorRole,role);assert.equal(m.practiceId,'session1');}
assert.throws(()=>makeMessage({body:'',role:'family'},'x','now'));
assert.throws(()=>makeMessage({body:'x'.repeat(1001),role:'family'},'x','now'));
assert.throws(()=>makeMessage({body:'hello',role:'unknown'},'x','now'));
const rows=timeline([{id:'new1',body:'nuevo',authorRole:'family',createdAt:'2026-10-06'}],[{id:'old1',body:'coach',created_at:'2026-10-04'}],[{id:'r1',message_id:'old1',body:'respuesta',created_at:'2026-10-05'},{id:'orphan',message_id:'missing',body:'no',created_at:'2026-10-05'}]);
assert.equal(rows.length,3);assert.equal(rows[0].authorRole,'coach');assert.equal(rows[1].parentId,'legacy-message:old1');assert.equal(rows[2].id,'new1');
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)

    def test_coach_analysis_evidence_and_missing_data(self):
        script="""
const assert=require('node:assert/strict');const {analyze,avg}=require('./nextlevel_coach_analysis.js');
const rows=[{fecha:'2026-01-01',pts:0,tc_att:5,t2_att:5,t3_att:0,t2_in:1,t3_in:0,tl_in:0,tl_att:1,to_perdidas:2,ast:0,faltas:1},{fecha:'2026-01-02',pts:10,tc_att:15,t2_att:15,t3_att:0,t2_in:9,t3_in:0,tl_in:3,tl_att:9,to_perdidas:0,ast:1,faltas:0}];
const m=analyze(rows);assert.equal(m.shooting.find(r=>r.key==='t2').pct,50);assert.equal(m.shooting.find(r=>r.key==='tl').pct,30);assert.equal(m.proposals.length,4);assert.equal(m.trend.length,0);assert.ok(m.distribution.includes('20/20'));
assert.equal(avg([{pts:null},{pts:10}],'pts'),null);assert.equal(analyze([{fecha:'2026-01-01'}]).proposals.length,0);
const few=analyze([{fecha:'2026-01-01',tl_in:0,tl_att:2}]);assert.equal(few.proposals.length,0);
const many=analyze(Array.from({length:10},(_,i)=>({fecha:'2026-01-'+String(i+1).padStart(2,'0'),pts:i})).reverse());assert.equal(many.trend[0].before,2);assert.equal(many.trend[0].recent,7);
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)

    def test_plan_progress_cloud_save_and_retry(self):
        script=r"""
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const nodes=[];class Node{constructor(tag){this.tag=tag;this.style={};this.children=[];this.events={};this.value='';nodes.push(this);}append(...values){this.children.push(...values);}replaceChildren(...values){this.children=values;}setAttribute(){}addEventListener(k,f){this.events[k]=f;}}
const root=new Node('root'),cache=new Map(),writes=[];let ready,fail=false;
const api={select(){return this;},eq(){return this;},like(){return this;},order(){return this;},async range(){return {data:[],error:null};},async maybeSingle(){return {data:null,error:null};},async upsert(row){writes.push(row);return {error:fail ? {message:'offline'} : null};}};
const context={document:{getElementById(){return root;},createElement:t=>new Node(t),createTextNode:text=>({text}),addEventListener:(event,fn)=>ready=fn},localStorage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)},_supa:{from:()=>api},PLAYER_ID:'test-only',Intl,Date,Set,Map,Number,JSON,crypto:require('node:crypto').webcrypto};
vm.createContext(context);vm.runInContext(fs.readFileSync('nextlevel_plan_progress.js','utf8'),context);
(async()=>{await ready();const form=nodes.find(n=>n.tag==='form'),check=nodes.find(n=>n.type==='checkbox');check.checked=true;await form.events.submit({preventDefault(){}});
assert.equal(writes.length,1);assert.equal(writes[0].player_id,'test-only');assert.ok(writes[0].module.startsWith('plan_progress_v1:'));assert.equal(writes[0].data.source,'player_training');assert.ok(nodes.some(n=>String(n.textContent).includes('pratiques') || String(n.textContent).includes('prácticas están guardadas')));
fail=true;check.checked=true;await form.events.submit({preventDefault(){}});assert.notEqual(writes[0].module,writes[1].module);
let saved=JSON.parse(cache.get('nl_plan_progress_v1_test-only'));assert.equal(saved.entries.length,2);assert.equal(saved.pending.length,1);
fail=false;await nodes.find(n=>n.textContent==='Reintentar guardados pendientes').events.click();saved=JSON.parse(cache.get('nl_plan_progress_v1_test-only'));assert.equal(saved.pending.length,0);
})().catch(e=>{console.error(e);process.exitCode=1;});
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)

    def test_plan_progress_dates_and_weighted_shots(self):
        script="""
const assert=require('node:assert/strict');const {validate,weekly}=require('./nextlevel_plan_progress.js');
const base={date:'2026-10-06',areas:['Tiro'],success:'',next:''};
assert.equal(validate(base,'2026-10-06'),'');
for(const date of ['2026-10-07','2026-02-30','2026-99-99','bad'])assert.ok(validate({...base,date},'2026-10-06'));
assert.ok(validate({...base,areas:[]},'2026-10-06'));
for(const shots of [{made:2,attempts:1},{made:0,attempts:0},{made:1.5,attempts:5}])assert.ok(validate({...base,shots},'2026-10-06'));
const r=weekly([{date:'2026-10-06',shots:{type:'Libres',made:1,attempts:1}}, {date:'2026-10-06',shots:{type:'Libres',made:1,attempts:9}}, {date:'2026-09-29'}, {date:'2026-10-07'}],'2026-10-06');
assert.equal(r.rows.length,2);assert.equal(r.days,1);assert.equal(r.shooting.Libres.made,2);assert.equal(r.shooting.Libres.attempts,10);
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)

    def test_evolution_actual_blocks(self):
        script="""
const assert=require('node:assert/strict');const {average,shooting,blocks}=require('./nextlevel_evolution.js');
const rows=Array.from({length:12},(_,i)=>({pts:i}));const b=blocks(rows);
assert.deepEqual(b.previous.map(r=>r.pts),[2,3,4,5,6]);assert.deepEqual(b.recent.map(r=>r.pts),[7,8,9,10,11]);
assert.equal(average([{pts:0},{pts:10}],'pts'),5);assert.equal(average([{pts:null},{pts:10}],'pts'),null);
assert.equal(shooting([{tc_in:1,tc_att:1},{tc_in:1,tc_att:9}],'tc').pct,20);
assert.equal(shooting([{tc_in:0,tc_att:0}],'tc').pct,null);
assert.equal(shooting([{tc_in:null,tc_att:3}],'tc'),null);
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)
        h=(R/'perfil_mia_sanchez_14.html').read_text(encoding='utf-8')
        self.assertNotIn('PROG_DATA',h)
        self.assertIn('nextlevel_evolution.js',h)

    def test_team_ranking_half_season(self):
        script="""
const assert=require('node:assert/strict');const {teamRanking}=require('./nextlevel_profile_extras.js');
const games=Array.from({length:5},(_,i)=>({available:true,players:[...(i<3?[{name:'QUALIFIED',pts:5}]:[]),...(i<2?[{name:'TOO FEW',pts:99}]:[])]}));
const r=teamRanking(games,'pts');assert.equal(r.minGames,3);assert.equal(r.rows.length,1);assert.equal(r.rows[0].name,'QUALIFIED');
assert.equal(teamRanking(games.slice(0,4),'pts').minGames,2);
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)
        h=(R/'perfil_mia_sanchez_14.html').read_text(encoding='utf-8')
        start=h.index('<div id="tab-rend"');end=h.index('<div id="tab-coach"')
        self.assertIn('id="season-milestones"',h[start:end])

    def test_heat_palette_thresholds(self):
        script="""
const assert=require('node:assert/strict');const {heatColor}=require('./nextlevel_profile_extras.js');
assert.equal(heatColor(null,'volume'),'#2C2F36');
assert.equal(heatColor({attempts:0,made:0},'conversion'),'#2C2F36');
for(const [attempts,color] of [[1,'#546E7A'],[14,'#546E7A'],[15,'#E65100'],[50,'#E65100'],[51,'#FF6D00']])assert.equal(heatColor({attempts,made:0},'volume'),color);
for(const [made,color] of [[0,'#29B6F6'],[24,'#29B6F6'],[25,'#FFD740'],[40,'#FFD740'],[41,'#00E676']])assert.equal(heatColor({attempts:100,made},'conversion'),color);
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)

    def test_team_ranking_coverage_and_ties(self):
        script="""
const assert=require('node:assert/strict');const {teamRanking}=require('./nextlevel_profile_extras.js');
const result=teamRanking([{available:true,players:[{name:'SANCHEZ, MIA',pts:10},{name:'OTRA',pts:5},{name:'SIN DATO',pts:null}]},{available:true,players:[{name:'MIA SANCHEZ',pts:0},{name:'OTRA',pts:5},{name:'SIN DATO',pts:10}]}],'pts');
assert.equal(result.rows.length,2);assert.equal(result.rows[0].avg,5);assert.equal(result.rows[0].rank,1);assert.equal(result.rows[1].rank,1);assert.equal(result.rows[0].pj,2);assert.equal(result.excluded,1);
assert.equal(teamRanking([{available:false,players:[{name:'X',pts:99}]}],'pts').rows.length,0);
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)

    def test_profile_navigation_order(self):
        h=(R/'perfil_mia_sanchez_14.html').read_text(encoding='utf-8')
        for start,end in [('<div class="tab-bar">','</div>'),('<nav class="bnav"','</nav>')]:
            block=h[h.index(start):h.index(end,h.index(start))]
            self.assertEqual(re.findall(r'data-tab="([^"]+)"',block)[:2],['dash','perfil'])
        self.assertIn("b.dataset.tab === id",h)
        self.assertNotIn('tabBtns[navIdx]',h)
        self.assertIn('id="plan-mental-content"',h)
        self.assertIn("'plan-mental-content'",(R/'nextlevel_profile_extras.js').read_text(encoding='utf-8'))

    def test_season_milestones(self):
        script = """
const assert=require('node:assert/strict');
const {seasonMilestones}=require('./nextlevel_profile_extras.js');
const games=[{pts:20,val:-3,reb_tot:10,ast:0,stl:0,blk:0},
 {pts:20,val:-1,reb_tot:null,ast:0,stl:0,blk:0},
 {pts:0,val:null,reb_tot:10,ast:10,stl:0,blk:0},
 {pts:null,val:null,reb_tot:null,ast:null,stl:null,blk:null}];
const s=seasonMilestones(games);
assert.equal(s.points.value,20);assert.equal(s.points.games.length,2);
assert.equal(s.valuation.value,-1);assert.equal(s.valuation.coverage,2);
assert.equal(s.doubles.length,2);assert.equal(s.complete,2);
assert.equal(seasonMilestones([]).points,null);
assert.equal(seasonMilestones([{pts:null,val:null}]).valuation,null);
assert.equal(seasonMilestones([{pts:10,reb_tot:10,ast:10}]).doubles.length,1);
"""
        subprocess.run([NODE,'-e',script],cwd=R,check=True,capture_output=True)

    def test_missing_and_zero(self):
        s=summarize_games([{'pts':0,'reb_tot':None},{'pts':10,'reb_tot':5}])
        self.assertEqual(s['ppg'],5)
        self.assertIsNone(s['rpg'])
        self.assertIsNone(s['fg_pct'])
    def test_weighted_shooting(self):
        s=summarize_games([dict(tc_in=1,tc_att=1,t3_in=1,tl_att=0,pts=3,ast=2,to_perdidas=0),
                           dict(tc_in=1,tc_att=9,t3_in=0,tl_att=2,pts=4,ast=2,to_perdidas=2)])
        self.assertEqual(s['fg_pct'],20)
        self.assertEqual(s['efg_pct'],25)
        self.assertAlmostEqual(s['ts_pct'],32.17)
        self.assertEqual(s['ast_to'],2)
    def test_safe_matching(self):
        self.assertIsNone(resolve_player_id('SANCHEZ, OTRA PERSONA'))
        self.assertIsNotNone(resolve_player_id('SANCHEZ, MIA GERALDINE'))
        self.assertEqual(resolve_player_id('ALMA, SMIGIEL'),resolve_player_id('SMIGIEL, ALMA'))
    def test_discovery(self):
        self.assertEqual(extraer_partido_ids({'listaFasesGrupo':[{'Opaque':'team','Rondas':[]}]}),[])
        self.assertEqual(len(extraer_partido_ids({'a':[{'IdPartido':'1'},{'IdPartido':'1'}]})),1)
    def test_failed_api_is_not_a_game(self):
        for payload in ({},{'resultado':'error'}, {'local':{},'visitante':{}}):
            with self.assertRaises(ValueError):procesar_boxscore('1','',payload)
    def fixture(self):
        import json
        return json.loads((R/'cabb_boxscore_obras_644845.json').read_text(encoding='utf-8'))
    def test_real_boxscore(self):
        f=self.fixture()
        rows=procesar_boxscore('644845','SEGUNDA ETAPA',f['boxscore'],f['fixture'])
        self.assertEqual(len(rows),5)
        mia=next(r for r in rows if r['player_id'].endswith('000014'))
        self.assertEqual((mia['pts'],mia['reb_tot'],mia['ast'],mia['stl'],mia['minutos']),(5,5,0,2,20))
        self.assertEqual((mia['t2_in'],mia['t2_att'],mia['tl_in'],mia['tl_att']),(2,6,1,3))
        self.assertEqual(mia['resultado_eq'],'46-65');self.assertFalse(mia['ganado'])
        self.assertEqual(mia['cabb_partido_id'],'644845')
    def test_real_missing_and_zero(self):
        f=self.fixture()
        mia=next(j for j in f['boxscore']['estadisticas']['estadisticasequipolocal'] if 'SANCHEZ' in j['nombre'])
        mia.pop('asistencias')
        rows=procesar_boxscore('644845','SEGUNDA ETAPA',f['boxscore'],f['fixture'])
        mia=next(r for r in rows if r['player_id'].endswith('000014'))
        self.assertIsNone(mia['ast']);self.assertEqual(mia['t3_att'],0)
    def test_invalid_attempts_rejected(self):
        f=self.fixture()
        f['boxscore']['estadisticas']['estadisticasequipolocal'][2]['tiro2p']=1
        with self.assertRaises(ValueError):procesar_boxscore('644845','',f['boxscore'],f['fixture'])
    def test_canonical_category_ids(self):
        from cabb_games import discover_games
        f=self.fixture()
        class API:
            def buscar_categorias(self,*args):return [{'Id':'canonical','NombreCategoria':'INFANTILES FEMENINO','NombreCompeticion':'FORMATIVAS 2026','NombreDelegacion':'ASOCIACIÓN FEMENINA METROPOLITANA'}]
            def get_categoria_fases_grupos(self,cat):
                assert cat=='canonical'
                return {'resultado':'correcto','listaFasesGrupo':[{'IdFase':'phase','NombreFase':'SEGUNDA ETAPA','Grupos':[{'IdGrupo':'group','NombreGrupo':'INTERCONFERENCIA A'}]}]}
            def get_categoria_horarios_jornadas(self,*args):
                assert args==('canonical','phase','group')
                return {'resultado':'correcto','partidos':[dict(f['fixture'],IdPartido='session-opaque'),dict(f['fixture'],IdPartido='session-opaque')]}
        _,games=discover_games(API(),f['fixture']['NombreEquipoLocal'])
        self.assertEqual(len(games),1);self.assertEqual(games[0]['IdPartidoNotificacion'],'644845')
    def test_federal_separate_from_afmb(self):
        import json
        from collections import Counter
        data=json.loads((R/'federal_sync_verified.json').read_text(encoding='utf-8'))
        rows=data['rows']
        self.assertEqual(len(rows),25)
        self.assertEqual(set(r['torneo'] for r in rows),{'Federal CABB'})
        self.assertEqual(set(Counter(r['player_id'] for r in rows).values()),{5})
        mia=[r for r in rows if r['player_id'].endswith('000014')]
        self.assertEqual(sum(r['pts'] for r in mia),34)
        self.assertEqual(summarize_games(mia)['ppg'],6.8)
        self.assertFalse({'644845'} & {r['cabb_partido_id'] for r in rows})
    def test_endpoint_path(self):
        from cabb_app_api import CABBApiClient
        client=CABBApiClient.__new__(CABBApiClient)
        client.id_dispositivo='test';client.key='test'
        calls=[]
        client._post=lambda url,params:calls.append((url,params)) or {}
        client.get_partido_stats('opaque')
        self.assertTrue(calls[0][0].endswith('/v2/envivo/estadisticas.ashx'))
        client.get_categoria_horarios_jornadas('canonical','phase','group')
        self.assertEqual(calls[1][1]['accion'],'horariosJornadas')
        self.assertEqual(calls[1][1]['id_categoria_competicion'],'canonical')
    def test_stats_never_null_existing(self):
        class Client:
            def get_equipo_jugadores(self,t):return [{'Nombre':'SANCHEZ, MIA GERALDINE','PartidosJugados':1,'PuntosPorPartido':0,'MinutosPorPartido':0}]
        class DB:
            data=[]
            def table(self,*a):return self
            def select(self,*a):return self
            def eq(self,*a):return self
            def gte(self,*a):return self
            def lt(self,*a):return self
            def execute(self):return self
            def upsert(self,row,**k):self.row=row;return self
        db=DB();sync_stats_seasons(Client(),'team',db,False)
        self.assertEqual(db.row['ppg'],0);self.assertNotIn('rpg',db.row)
    def test_syntax_and_ids(self):
        for f in R.glob('*.py'):ast.parse(f.read_text(encoding='utf-8'))
        for name in ('perfil_mia_sanchez_14.html','perfil_martina_bailon_10.html'):
            h=(R/name).read_text(encoding='utf-8')
            old=subprocess.check_output(['git','-c','safe.directory='+str(R),'show','HEAD:'+name],cwd=R).decode('utf-8')
            for script in re.findall(r'<script[^>]*>(.*?)</script>',h,re.S):
                result=subprocess.run([NODE,'--check'],input=script.encode('utf-8'),capture_output=True)
                self.assertEqual(result.returncode,0,result.stderr.decode('utf-8'))
            # Physical pane retained verbatim; navigation uses semantic destinations.
            for start,end in [('<div id="tab-fis"','</div><!-- /tab-fis -->')]:
                if start in old and end in old:
                    self.assertEqual(old[old.index(start):old.index(end,old.index(start))],h[h.index(start):h.index(end,h.index(start))])
            if name.startswith('perfil_mia'):
                self.assertEqual(old[old.index('const FIS_PLAYER_ID'):old.index('</script>',old.index('const FIS_PLAYER_ID'))],h[h.index('const FIS_PLAYER_ID'):h.index('</script>',h.index('const FIS_PLAYER_ID'))])
            original_ids=set(re.findall(r'id="([^"]+)"',old));new_ids=set(re.findall(r'id="([^"]+)"',h))
            self.assertTrue({'tab-rend','tab-coach','tab-prog','tab-plan','tab-fis','tab-perfil'}<=new_ids)
        r=subprocess.run([NODE,'--check',str(R/'nextlevel_performance.js')],capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)
    def test_browser_math(self):
        source="const a=require(process.argv[1]); const s=a.summarize([{pts:0,ast:null,tc_in:1,tc_att:1},{pts:10,ast:2,tc_in:1,tc_att:9}]); if(s.PTS!==5 || s.AST!==null || s['TC%']!==20) throw Error(JSON.stringify(s));"
        r=subprocess.run([NODE,'-e',source,str(R/'nextlevel_performance.js')],capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)

if __name__=='__main__':unittest.main(verbosity=2)
