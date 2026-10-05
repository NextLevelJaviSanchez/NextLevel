import sys,unittest,subprocess,re,ast
from pathlib import Path
R=Path(__file__).resolve().parent
sys.path.insert(0,str(R))
from nextlevel_metrics import summarize_games
from sync_cabb_supabase import procesar_boxscore,extraer_partido_ids,parse_minutes,parse_bool,resolve_player_id,sync_stats_seasons
import os
NODE=os.environ.get('NEXTLEVEL_NODE','node')

class Regression(unittest.TestCase):
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
    def test_discovery(self):
        self.assertEqual(extraer_partido_ids({'listaFasesGrupo':[{'Opaque':'team','Rondas':[]}]}),[])
        self.assertEqual(len(extraer_partido_ids({'a':[{'IdPartido':'1'},{'IdPartido':'1'}]})),1)
    def test_failed_api_is_not_a_game(self):
        for payload in ({},{'resultado':'error'}, {'local':{},'visitante':{}}):
            with self.assertRaises(ValueError):procesar_boxscore('1','',payload)
    def test_synthetic_boxscore_preserves_missing(self):
        payload={'local':{'nombre':'BERAZATEGUI','jugadoras':[{'Nombre':'SANCHEZ, MIA GERALDINE','Puntos':0,'Minutos':'12:30','Titular':'false'}]},
                 'visitante':{'nombre':'Rival'},'fecha':'05/10/2026','resultado_local':50,'resultado_visitante':40}
        row=procesar_boxscore('synthetic-only','Test',payload)[0]
        self.assertEqual(row['pts'],0);self.assertIsNone(row['ast']);self.assertFalse(row['titular'])
        self.assertEqual(row['minutos'],12.5)
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
            # Login/logout/tab navigation and physical pane are retained verbatim.
            for start,end in [("function showTab(","/* ─── INIT"),('<div id="tab-fis"','</div><!-- /tab-fis -->')]:
                if start in old and end in old:
                    self.assertEqual(old[old.index(start):old.index(end,old.index(start))],h[h.index(start):h.index(end,h.index(start))])
            if name.startswith('perfil_mia'):
                self.assertEqual(old[old.index('const FIS_PLAYER_ID'):],h[h.index('const FIS_PLAYER_ID'):].replace('<script src="nextlevel_performance.js" data-player-id="11111111-0000-0000-0000-000000000014" data-season="2026"></script>\n',''))
            original_ids=set(re.findall(r'id="([^"]+)"',old));new_ids=set(re.findall(r'id="([^"]+)"',h))
            self.assertTrue({'tab-rend','tab-coach','tab-prog','tab-plan','tab-fis','tab-perfil'}<=new_ids)
        r=subprocess.run([NODE,'--check',str(R/'nextlevel_performance.js')],capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)
    def test_browser_math(self):
        source="const a=require(process.argv[1]); const s=a.summarize([{pts:0,ast:null,tc_in:1,tc_att:1},{pts:10,ast:2,tc_in:1,tc_att:9}]); if(s.PTS!==5 || s.AST!==null || s['TC%']!==20) throw Error(JSON.stringify(s));"
        r=subprocess.run([NODE,'-e',source,str(R/'nextlevel_performance.js')],capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)

if __name__=='__main__':unittest.main(verbosity=2)
