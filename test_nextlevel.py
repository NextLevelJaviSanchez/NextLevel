import sys,unittest,subprocess,re,ast
from pathlib import Path
R=Path(__file__).resolve().parent
sys.path.insert(0,str(R))
from nextlevel_metrics import summarize_games
from sync_cabb_supabase import procesar_boxscore,extraer_partido_ids,parse_minutes,parse_bool,resolve_player_id,sync_stats_seasons
import os
NODE=os.environ.get('NEXTLEVEL_NODE','node')

class Regression(unittest.TestCase):
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
