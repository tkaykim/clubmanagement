/* OneShot Crew — Admin Manage (6 tabs), Members, Calendar, MyPage, Announcements */

function ManagePage({ go, id, state, dispatch, toast }) {
  const p = state.projects.find(pp => pp.id===id);
  const [tab, setTab] = React.useState('applicants');
  if (!p) return <div className="page">프로젝트를 찾을 수 없습니다.</div>;

  return (
    <div className="page" style={{maxWidth:1240}}>
      <div className="row mb-16 gap-6 muted text-xs mono" style={{textTransform:'uppercase', letterSpacing:'0.08em'}}>
        <button className="btn ghost sm" style={{padding:'0 6px', height:22}} onClick={()=>go('project', p.id)}>
          <I.chevL size={12}/> 프로젝트
        </button><span>/</span><span>MANAGE</span>
      </div>

      <div className="page-head">
        <div>
          <div className="row gap-6 mb-8"><StatusBadge status={p.status}/><StatusBadge status={p.type}/></div>
          <h1 style={{fontSize:26}}>{p.title}</h1>
          <div className="sub">운영진 워크벤치 · 지원자 선별 / 로스터 / 가용성 / 정산 / 공지 / 설정</div>
        </div>
        <div className="row gap-8">
          <button className="btn" onClick={()=>go('project', p.id)}><I.ext size={14}/>멤버용 보기</button>
          <select className="select" style={{width:140, height:34}} defaultValue={p.status}>
            <option value="recruiting">모집중</option>
            <option value="selecting">선별중</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
            <option value="cancelled">취소</option>
          </select>
        </div>
      </div>

      <div className="tabs">
        {[
          { id:'applicants', label:'지원자',   count:p.applicants.length },
          { id:'roster',     label:'로스터',   count:p.applicants.filter(a=>a.status==='approved').length },
          { id:'availability',label:'가용성'},
          { id:'settlement', label:'정산',     count:p.applicants.filter(a=>a.status==='approved').length },
          { id:'announce',   label:'공지',     count:2 },
          { id:'settings',   label:'설정' },
        ].map(t => (
          <div key={t.id} className={cn('tab', tab===t.id && 'on')} onClick={()=>setTab(t.id)}>
            {t.label} {t.count != null && <span className="count">{t.count}</span>}
          </div>
        ))}
      </div>

      {tab==='applicants'   && <ApplicantsTab p={p} dispatch={dispatch} toast={toast}/>}
      {tab==='roster'       && <RosterTab p={p} state={state} toast={toast}/>}
      {tab==='availability' && <AvailabilityTab p={p} state={state}/>}
      {tab==='settlement'   && <SettlementTab p={p}/>}
      {tab==='announce'     && <ProjectAnnounceTab p={p} state={state}/>}
      {tab==='settings'     && <SettingsTab p={p}/>}
    </div>
  );
}

function ApplicantsTab({ p, dispatch, toast }) {
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState({});
  const filtered = filter==='all' ? p.applicants : p.applicants.filter(a => a.status===filter);
  const selectedIds = Object.keys(selected).filter(k => selected[k]);
  const allSel = filtered.length && filtered.every(a => selected[a.memberId]);

  const setStatus = (memId, status) => {
    dispatch({ type:'SET_APPLICANT_STATUS', projectId:p.id, memberId:memId, status });
    toast(status==='approved' ? '확정 처리되었습니다' : status==='rejected' ? '탈락 처리되었습니다' : '보류로 변경');
  };
  const bulkStatus = (status) => {
    selectedIds.forEach(id => dispatch({ type:'SET_APPLICANT_STATUS', projectId:p.id, memberId:id, status }));
    toast(`${selectedIds.length}명 ${status==='approved'?'확정':'탈락'} 처리`);
    setSelected({});
  };

  return (
    <div>
      <div className="row mb-16" style={{justifyContent:'space-between'}}>
        <Seg value={filter} onChange={setFilter} options={[
          { value:'all',      label:`전체 (${p.applicants.length})` },
          { value:'pending',  label:`대기 (${p.applicants.filter(a=>a.status==='pending').length})` },
          { value:'approved', label:`확정 (${p.applicants.filter(a=>a.status==='approved').length})` },
          { value:'rejected', label:`탈락 (${p.applicants.filter(a=>a.status==='rejected').length})` },
        ]}/>
        <div className="row gap-6">
          {selectedIds.length > 0 && (
            <>
              <span className="text-xs muted mono">{selectedIds.length}명 선택</span>
              <button className="btn sm" onClick={()=>bulkStatus('approved')}><I.check size={12}/>일괄 확정</button>
              <button className="btn sm danger" onClick={()=>bulkStatus('rejected')}><I.x size={12}/>일괄 탈락</button>
              <div style={{width:1, height:20, background:'var(--border)'}}/>
            </>
          )}
          <button className="btn sm"><I.download size={12}/>CSV</button>
        </div>
      </div>

      <div className="card flush">
        <table className="tbl">
          <thead>
            <tr>
              <th className="checkbox-col">
                <Checkbox on={allSel} onChange={b => {
                  const ns = {...selected};
                  filtered.forEach(a => ns[a.memberId] = b);
                  setSelected(ns);
                }}/>
              </th>
              <th>지원자</th>
              <th>지원일</th>
              <th className="num">점수</th>
              <th>상태</th>
              <th>메모</th>
              <th style={{width:200}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const m = MEMBERS.find(mm => mm.id===a.memberId);
              return (
                <tr key={a.memberId}>
                  <td><Checkbox on={!!selected[a.memberId]} onChange={b=>setSelected(s=>({...s, [a.memberId]:b}))}/></td>
                  <td>
                    <div className="row gap-8">
                      <Avatar name={m.name} size="sm"/>
                      <div>
                        <div style={{fontWeight:500}}>{m.name} <span className="muted" style={{fontSize:11}}>· {m.stage}</span></div>
                        <div className="mono text-xs muted">{m.pos} · {m.contract==='contract'?'계약':m.contract==='non_contract'?'비계약':'게스트'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono text-xs muted">{a.at}</td>
                  <td className="num"><b>{a.score?.toFixed(1) || '—'}</b></td>
                  <td><StatusBadge status={a.status}/></td>
                  <td className="text-xs muted" style={{maxWidth:200}}>{a.memo || '—'}</td>
                  <td>
                    <div className="row gap-4" style={{justifyContent:'flex-end'}}>
                      {a.status !== 'approved' && <button className="btn sm primary" onClick={()=>setStatus(a.memberId,'approved')}><I.check size={12}/>확정</button>}
                      {a.status !== 'rejected' && <button className="btn sm danger" onClick={()=>setStatus(a.memberId,'rejected')}><I.x size={12}/>탈락</button>}
                      <button className="btn sm ghost icon-only"><I.more size={12}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && <div className="empty"><I.users className="ico"/>지원자가 없습니다.</div>}
      </div>
    </div>
  );
}

function RosterTab({ p, state, toast }) {
  const confirmed = p.applicants.filter(a=>a.status==='approved');
  const conflicts = id => state.projects
    .filter(pp => pp.id!==p.id && pp.applicants.some(a => a.memberId===id && a.status==='approved'))
    .flatMap(pp => pp.dates.filter(d => p.dates.some(pd => pd.date===d.date)))
    .length > 0;

  return (
    <div>
      <div className="row mb-16" style={{justifyContent:'space-between'}}>
        <b className="text-sm">확정 로스터 · {confirmed.length}명</b>
        <div className="row gap-6">
          <button className="btn sm"><I.plus size={12}/>멤버 추가</button>
          <button className="btn sm"><I.send size={12}/>로스터 공지</button>
        </div>
      </div>
      <div className="grid grid-3">
        {confirmed.map(a => {
          const m = MEMBERS.find(mm => mm.id===a.memberId);
          const conflict = conflicts(m.id);
          return (
            <div key={m.id} className="card">
              <div className="row mb-12" style={{justifyContent:'space-between'}}>
                <Avatar name={m.name} size="lg"/>
                {conflict && <Badge kind="warn" icon={<I.warn/>}>일정 충돌</Badge>}
              </div>
              <div style={{fontSize:15, fontWeight:600}}>{m.name}</div>
              <div className="mono text-xs muted">{m.stage} · {m.pos}</div>
              <div className="divider" style={{margin:'12px 0'}}/>
              <dl className="kv">
                <dt>계약</dt><dd className="text-xs">{m.contract==='contract'?'계약멤버':m.contract==='non_contract'?'비계약':'게스트'}</dd>
                <dt>페이</dt><dd className="tabnum text-xs">₩ {fmtKRW(p.fee)} <span className="muted" style={{fontSize:10}}>(기본)</span></dd>
              </dl>
              <div className="row mt-12 gap-4">
                <button className="btn sm" style={{flex:1}}><I.edit size={12}/>역할</button>
                <button className="btn sm ghost icon-only" onClick={()=>{toast(`${m.name} 로스터에서 제거`);}}><I.trash size={12}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AvailabilityTab({ p, state }) {
  const allDates = [...p.practiceDates.map(d=>d.date), ...p.dates.map(d=>d.date)]
    .sort((a,b)=>a.localeCompare(b));
  const applicants = p.applicants.filter(a=>a.status!=='rejected');

  // summary per date
  const summary = allDates.map(d => {
    let y=0,mb=0,n=0;
    applicants.forEach(a => {
      const v = state.votes[`${p.id}:${d}:${a.memberId}`];
      if (!v) return;
      if (v.status==='available') y++;
      else if (v.status==='maybe') mb++;
      else if (v.status==='unavailable') n++;
    });
    return { date:d, y, mb, n };
  });
  const maxAvail = Math.max(...summary.map(s => s.y+s.mb), 1);

  return (
    <div>
      <div className="card mb-16">
        <div className="row mb-12" style={{justifyContent:'space-between'}}>
          <b className="text-sm">날짜별 가용성 집계</b>
          <div className="row gap-8 text-xs mono muted">
            <span className="row gap-4"><span style={{width:10, height:10, background:'var(--fg)'}}/>가능</span>
            <span className="row gap-4"><span style={{width:10, height:10, background:'#9a9aa1'}}/>부분</span>
            <span className="row gap-4"><span style={{width:10, height:10, background:'#FCA5A5'}}/>불가</span>
          </div>
        </div>
        <div className="grid" style={{gridTemplateColumns:`repeat(${allDates.length}, minmax(0,1fr))`, gap:4}}>
          {summary.map(s => {
            const dt = new Date(s.date);
            const isEvent = p.dates.some(d=>d.date===s.date);
            return (
              <div key={s.date} style={{display:'flex', flexDirection:'column', gap:4}}>
                <div className="mono text-xs" style={{textAlign:'center', fontWeight:500}}>
                  {dt.getMonth()+1}/{dt.getDate()}
                </div>
                <div className="mono text-xs muted" style={{textAlign:'center'}}>{DOW_SHORT[dt.getDay()]}</div>
                <div style={{height:90, background:'var(--muted)', borderRadius:4, display:'flex', flexDirection:'column-reverse', overflow:'hidden', border: isEvent?'1px solid var(--fg)':'1px solid transparent'}}>
                  <div style={{background:'var(--fg)', height:`${(s.y/maxAvail)*100}%`}}/>
                  <div style={{background:'#9a9aa1', height:`${(s.mb/maxAvail)*100}%`}}/>
                </div>
                <div className="mono text-xs tabnum" style={{textAlign:'center'}}>{s.y}<span className="muted">/{applicants.length}</span></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card flush">
        <div className="card-head">
          <h3>히트맵 · 멤버 × 날짜</h3>
          <span className="hint">클릭하여 상태 확인</span>
        </div>
        <div style={{padding:16, overflowX:'auto'}}>
          <div className="heatmap" style={{gridTemplateColumns:`120px repeat(${allDates.length}, minmax(44px, 1fr))`}}>
            <div/>
            {allDates.map(d => {
              const dt=new Date(d);
              const isEvent = p.dates.some(x=>x.date===d);
              return <div key={d} style={{textAlign:'center', fontSize:10.5, padding:'4px 0', fontFamily:'var(--mono)', color: isEvent?'var(--fg)':'var(--mf)', fontWeight: isEvent?600:400}}>
                {dt.getMonth()+1}/{dt.getDate()}<br/>{DOW_SHORT[dt.getDay()]}
              </div>;
            })}
            {applicants.map(a => {
              const m = MEMBERS.find(mm => mm.id===a.memberId);
              return (
                <React.Fragment key={a.memberId}>
                  <div style={{padding:'6px 8px', fontSize:12, display:'flex', alignItems:'center', gap:6, borderRight:'1px solid var(--border)'}}>
                    <Avatar name={m.name} size="sm"/>
                    <span style={{fontWeight:500}}>{m.name}</span>
                    {a.status==='approved' && <span style={{width:6, height:6, borderRadius:'50%', background:'var(--ok)'}}/>}
                  </div>
                  {allDates.map(d => {
                    const v = state.votes[`${p.id}:${d}:${m.id}`];
                    const lvl = v?.status==='available' ? 4 : v?.status==='maybe' ? 2 : v?.status==='unavailable' ? 0 : 1;
                    const char = v?.status==='available' ? '●' : v?.status==='maybe' ? '◐' : v?.status==='unavailable' ? '×' : '—';
                    return <div key={d} className="heat-cell" data-lvl={lvl} title={`${m.name} · ${d} · ${v?.status ?? '미제출'}`}>{char}</div>;
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettlementTab({ p }) {
  const confirmed = p.applicants.filter(a=>a.status==='approved');
  const [payouts, setPayouts] = React.useState(
    confirmed.map(a => ({
      memberId: a.memberId,
      amount: p.fee > 0 ? p.fee : 0,
      status: a.memberId==='m1' ? 'paid' : a.memberId==='m2' ? 'scheduled' : 'pending',
      scheduledAt: '2026-05-31',
      paidAt: a.memberId==='m1' ? '2026-04-18' : null,
    }))
  );
  const total = payouts.reduce((s,p)=>s+p.amount, 0);
  const paidTotal = payouts.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount, 0);

  const next = (s) => s==='pending' ? 'scheduled' : s==='scheduled' ? 'paid' : 'paid';
  const advance = (i) => setPayouts(ps => ps.map((x,j) => j===i ? {...x, status:next(x.status), paidAt: next(x.status)==='paid' ? '2026-04-22' : x.paidAt} : x));

  return (
    <div>
      <div className="grid grid-4 mb-16">
        <div className="card"><div className="stat"><div className="lab">총 정산액</div><div className="num tabnum">₩{fmtKRW(total)}</div><div className="delta">{payouts.length}명</div></div></div>
        <div className="card"><div className="stat"><div className="lab">지급 완료</div><div className="num tabnum" style={{color:'var(--ok)'}}>₩{fmtKRW(paidTotal)}</div><div className="delta">{payouts.filter(p=>p.status==='paid').length}명</div></div></div>
        <div className="card"><div className="stat"><div className="lab">예정</div><div className="num tabnum">₩{fmtKRW(payouts.filter(p=>p.status==='scheduled').reduce((s,p)=>s+p.amount,0))}</div><div className="delta">{payouts.filter(p=>p.status==='scheduled').length}명</div></div></div>
        <div className="card"><div className="stat"><div className="lab">대기</div><div className="num tabnum" style={{color:'var(--warn)'}}>₩{fmtKRW(payouts.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0))}</div><div className="delta">{payouts.filter(p=>p.status==='pending').length}명</div></div></div>
      </div>
      <div className="card flush">
        <table className="tbl">
          <thead><tr><th>멤버</th><th className="num">금액</th><th>상태</th><th>예정일</th><th>지급일</th><th></th></tr></thead>
          <tbody>
            {payouts.map((po,i) => {
              const m = MEMBERS.find(mm=>mm.id===po.memberId);
              return (
                <tr key={po.memberId}>
                  <td><div className="row gap-8"><Avatar name={m.name} size="sm"/><span style={{fontWeight:500}}>{m.name}</span><span className="muted text-xs mono">{m.stage}</span></div></td>
                  <td className="num"><b>₩ {fmtKRW(po.amount)}</b></td>
                  <td>{po.status==='paid' ? <Badge kind="ok">지급완료</Badge> : po.status==='scheduled' ? <Badge kind="warn">예정</Badge> : <Badge kind="outline">대기</Badge>}</td>
                  <td className="mono text-xs muted">{po.scheduledAt}</td>
                  <td className="mono text-xs muted">{po.paidAt || '—'}</td>
                  <td>
                    {po.status !== 'paid' &&
                      <button className="btn sm" onClick={()=>advance(i)}>{po.status==='pending' ? '예정으로' : '지급완료'} <I.arrowR size={12}/></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectAnnounceTab({ p, state }) {
  return (
    <div>
      <div className="card mb-16">
        <h3 style={{margin:'0 0 12px', fontSize:14}}>새 공지 작성</h3>
        <div className="field"><label>제목</label><input className="input" placeholder="프로젝트 공지 제목"/></div>
        <div className="field"><label>본문</label><textarea className="textarea" rows={4} placeholder="로스터에게 전달할 공지 내용"/></div>
        <div className="row" style={{justifyContent:'space-between'}}>
          <label className="row gap-8 text-xs"><Switch on={false} onChange={()=>{}}/>상단 고정</label>
          <button className="btn primary"><I.send size={14}/>발행</button>
        </div>
      </div>
      <div className="card flush">
        <div className="card-head"><h3>이 프로젝트의 공지</h3></div>
        {state.announcements.filter(a=>a.project===p.id).map(a => (
          <div key={a.id} style={{padding:'14px 18px', borderBottom:'1px solid var(--border)'}}>
            <div className="row" style={{justifyContent:'space-between'}}>
              <b className="text-sm">{a.title}</b>
              <span className="mono text-xs muted">{a.at} · {a.author}</span>
            </div>
            <p className="text-sm muted mt-4" style={{margin:0}}>{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ p }) {
  return (
    <div className="grid grid-2">
      <div className="card">
        <h3 style={{margin:'0 0 14px', fontSize:14}}>프로젝트 설정</h3>
        <div className="field"><label>제목</label><input className="input" defaultValue={p.title}/></div>
        <div className="field"><label>설명</label><textarea className="textarea" defaultValue={p.desc}/></div>
        <div className="row gap-8">
          <button className="btn primary">저장</button>
          <button className="btn danger"><I.trash size={12}/>프로젝트 삭제</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{margin:'0 0 14px', fontSize:14}}>공개 링크 · QR</h3>
        <div className="row mb-12">
          <input className="input mono text-xs" readOnly value={`https://oneshot.app/apply/${p.id}`}/>
          <button className="btn sm" style={{marginLeft:8}}><I.copy size={12}/></button>
        </div>
        <div className="poster square" style={{width:180, height:180}}>QR CODE</div>
        <div className="text-xs muted mt-12">게스트는 로그인 없이 이 링크로 지원 가능합니다.</div>
      </div>
    </div>
  );
}

/* ========== MEMBERS ========== */
function MembersPage({ go }) {
  const [role, setRole] = React.useState('all');
  const list = MEMBERS.filter(m => role==='all' ? true : m.contract===role);
  return (
    <div className="page">
      <div className="page-head">
        <div><h1><span className="serif-tag">The</span>Crew</h1>
        <div className="sub">총 {MEMBERS.length}명 · 계약 {MEMBERS.filter(m=>m.contract==='contract').length} · 비계약 {MEMBERS.filter(m=>m.contract==='non_contract').length} · 게스트 {MEMBERS.filter(m=>m.contract==='guest').length}</div></div>
        <button className="btn primary"><I.plus size={14}/>멤버 추가</button>
      </div>
      <div className="row mb-24" style={{justifyContent:'space-between'}}>
        <Seg value={role} onChange={setRole} options={[
          { value:'all', label:'전체' },
          { value:'contract', label:'계약' },
          { value:'non_contract', label:'비계약' },
          { value:'guest', label:'게스트' },
        ]}/>
      </div>
      <div className="grid grid-4">
        {list.map(m => (
          <div key={m.id} className="card">
            <div className="row mb-12" style={{justifyContent:'space-between'}}>
              <Avatar name={m.name} size="lg"/>
              {!m.active && <Badge kind="outline">휴식</Badge>}
            </div>
            <div style={{fontSize:16, fontWeight:700, letterSpacing:'-0.01em'}}>{m.name}</div>
            <div className="mono text-xs muted mt-4">{m.stage}</div>
            <div className="divider" style={{margin:'12px 0'}}/>
            <div className="row" style={{justifyContent:'space-between'}}>
              <span className="text-xs">{m.pos}</span>
              <Badge kind={m.contract==='contract'?'solid':m.contract==='guest'?'warn':''}>
                {m.contract==='contract'?'계약':m.contract==='non_contract'?'비계약':'게스트'}
              </Badge>
            </div>
            <div className="mono text-xs muted mt-8">JOIN · {m.join}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== CALENDAR ========== */
function CalendarPage({ go, state }) {
  const [cur, setCur] = React.useState(new Date(TODAY));
  const y = cur.getFullYear(), mo = cur.getMonth();
  const cells = monthMatrix(y, mo);

  // Build date -> events map (for me)
  const dateMap = {};
  state.projects.forEach(p => {
    const mine = p.applicants.find(a => a.memberId===ME_ID);
    [...p.dates.map(d=>({...d, kind:'event'})), ...p.practiceDates.map(d=>({...d, kind:'practice'}))]
      .forEach(d => {
        if (!dateMap[d.date]) dateMap[d.date]=[];
        dateMap[d.date].push({
          title: p.title, kind:d.kind, label:d.label,
          status: mine?.status, projectId:p.id, venue:p.venue, type:p.type,
        });
      });
  });

  const todayKey = dateKey(TODAY);
  const shift = (n) => setCur(new Date(y, mo+n, 1));

  const [sel, setSel] = React.useState(todayKey);
  const selEvents = dateMap[sel] || [];

  return (
    <div className="page" style={{maxWidth:1200}}>
      <div className="page-head">
        <div>
          <h1><span className="serif-tag">My</span>Calendar</h1>
          <div className="sub">내 확정·대기·연습 일정</div>
        </div>
        <div className="row gap-8">
          <button className="btn icon-only" onClick={()=>shift(-1)}><I.chevL size={14}/></button>
          <div style={{minWidth:140, textAlign:'center', fontSize:17, fontWeight:600, letterSpacing:'-0.01em'}}>
            {y}.{pad2(mo+1)}
          </div>
          <button className="btn icon-only" onClick={()=>shift(1)}><I.chevR size={14}/></button>
          <button className="btn" onClick={()=>setCur(new Date(TODAY))}>오늘</button>
        </div>
      </div>

      <div className="row mb-16 text-xs mono muted gap-16">
        <span className="row gap-6"><span style={{width:8, height:8, borderRadius:'50%', background:'var(--ok)'}}/>확정</span>
        <span className="row gap-6"><span style={{width:8, height:8, borderRadius:'50%', background:'var(--warn)'}}/>대기</span>
        <span className="row gap-6"><span style={{width:8, height:8, borderRadius:'50%', background:'var(--mf-2)'}}/>연습</span>
      </div>

      <div className="grid" style={{gridTemplateColumns:'1fr 340px', gap:24}}>
        <div>
          <div className="cal">
            {['일','월','화','수','목','금','토'].map(d=><div key={d} className="cal-dow">{d}</div>)}
            {cells.map((d,i) => {
              const k = dateKey(d);
              const inMonth = d.getMonth()===mo;
              const events = dateMap[k] || [];
              return (
                <div key={i} className={cn('cal-cell', !inMonth && 'other', k===todayKey && 'today', k===sel && 'selected')}
                     style={k===sel?{boxShadow:'inset 0 0 0 2px var(--fg)'}:null}
                     onClick={()=>setSel(k)}>
                  <div className="d">{d.getDate()}</div>
                  {events.slice(0,3).map((e,j) => (
                    <div key={j} className={cn('evt', e.status==='approved'&&'ok', e.status==='pending'&&'warn', e.kind==='practice'&&'off')}>
                      {e.kind==='event' ? '▸' : '·'} {e.label || e.title.slice(0,10)}
                    </div>
                  ))}
                  {events.length>3 && <div className="text-xs muted">+{events.length-3}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{alignSelf:'start'}}>
          <div className="mono text-xs muted" style={{letterSpacing:'0.08em'}}>{sel} · {DOW_FULL[new Date(sel).getDay()]}</div>
          <div style={{fontSize:24, fontWeight:700, letterSpacing:'-0.02em', marginTop:4}}>
            {selEvents.length ? `${selEvents.length}개 일정` : '일정 없음'}
          </div>
          <div className="divider"/>
          {selEvents.map((e,i) => (
            <div key={i} className="row mb-12" style={{cursor:'pointer', padding:8, borderRadius:8}}
                 onClick={()=>go('project', e.projectId)}>
              <div style={{width:4, alignSelf:'stretch', background: e.status==='approved'?'var(--ok)':e.status==='pending'?'var(--warn)':'var(--mf-2)', borderRadius:2}}/>
              <div className="flex-1" style={{marginLeft:4}}>
                <div className="row gap-6">
                  {e.kind==='event' ? <Badge kind="solid">EVENT</Badge> : <Badge kind="outline">연습</Badge>}
                  {e.status && <StatusBadge status={e.status}/>}
                </div>
                <div className="text-sm mt-4" style={{fontWeight:500}}>{e.title}</div>
                <div className="mono text-xs muted">{e.venue}</div>
              </div>
              <I.arrowR size={14}/>
            </div>
          ))}
          {!selEvents.length && <div className="empty"><I.calendar className="ico"/>이 날짜는 일정이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}

/* ========== MY PAGE ========== */
function MyPage({ go, state }) {
  const [tab, setTab] = React.useState('apps');
  const me = MEMBERS.find(m=>m.id===ME_ID);
  const apps = state.projects.flatMap(p => p.applicants.filter(a=>a.memberId===ME_ID).map(a=>({...a, project:p})));

  return (
    <div className="page" style={{maxWidth:1080}}>
      <div className="page-head">
        <div className="row gap-16">
          <Avatar name={me.name} size="lg"/>
          <div>
            <h1 style={{margin:0, fontSize:28}}>{me.name}</h1>
            <div className="mono text-xs muted" style={{letterSpacing:'0.08em'}}>{me.stage} · {me.pos} · 계약</div>
          </div>
        </div>
        <button className="btn"><I.edit size={14}/>프로필 수정</button>
      </div>

      <div className="grid grid-4 mb-24">
        <div className="card"><div className="stat"><div className="lab">총 참여</div><div className="num tabnum">12</div><div className="delta">2024~2026</div></div></div>
        <div className="card"><div className="stat"><div className="lab">확정</div><div className="num tabnum">{apps.filter(a=>a.status==='approved').length}</div><div className="delta">진행 {apps.filter(a=>a.status==='approved' && a.project.status!=='completed').length}건</div></div></div>
        <div className="card"><div className="stat"><div className="lab">대기</div><div className="num tabnum">{apps.filter(a=>a.status==='pending').length}</div><div className="delta">응답 대기</div></div></div>
        <div className="card"><div className="stat"><div className="lab">연간 총 페이</div><div className="num tabnum">₩850<span style={{fontSize:14, color:'var(--mf)', marginLeft:4}}>만</span></div><div className="delta">2026</div></div></div>
      </div>

      <div className="tabs">
        {[{id:'apps',label:'지원 이력'},{id:'payouts',label:'정산'},{id:'avail',label:'가용성 프리셋'},{id:'profile',label:'프로필'}].map(t => (
          <div key={t.id} className={cn('tab', tab===t.id&&'on')} onClick={()=>setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {tab==='apps' && (
        <div className="card flush">
          <table className="tbl">
            <thead><tr><th>프로젝트</th><th>유형</th><th>지원일</th><th>상태</th><th className="num">페이</th><th></th></tr></thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.project.id}>
                  <td><b>{a.project.title}</b></td>
                  <td><StatusBadge status={a.project.type}/></td>
                  <td className="mono text-xs muted">{a.at}</td>
                  <td><StatusBadge status={a.status}/></td>
                  <td className="num"><b>₩ {fmtKRW(a.project.fee)}</b></td>
                  <td><button className="btn sm" onClick={()=>go('project', a.project.id)}>보기 <I.arrowR size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==='payouts' && (
        <div className="card flush">
          <table className="tbl">
            <thead><tr><th>월</th><th>프로젝트</th><th className="num">금액</th><th>상태</th><th>지급일</th></tr></thead>
            <tbody>
              <tr><td className="mono">2026-04</td><td>브랜드 X 런칭 파티</td><td className="num"><b>₩ 500,000</b></td><td><Badge kind="warn">예정</Badge></td><td className="mono text-xs muted">2026-05-10</td></tr>
              <tr><td className="mono">2026-03</td><td>3월 팀 워크숍 강사</td><td className="num"><b>₩ 200,000</b></td><td><Badge kind="ok">지급완료</Badge></td><td className="mono text-xs muted">2026-04-05</td></tr>
              <tr><td className="mono">2026-02</td><td>겨울 콘텐츠 촬영</td><td className="num"><b>₩ 150,000</b></td><td><Badge kind="ok">지급완료</Badge></td><td className="mono text-xs muted">2026-03-03</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tab==='avail' && (
        <div>
          <div className="mb-16 muted text-sm">자주 쓰는 가용성 패턴을 저장해 두면 지원 폼에서 <b>한 번의 클릭으로 불러올 수 있습니다</b>.</div>
          <div className="grid grid-3">
            {[
              { name:'주중 저녁 위주', desc:'월·수·금 20:00~23:00' },
              { name:'주말 종일', desc:'토·일 10:00~22:00' },
              { name:'4월 후반 헤비', desc:'04/22~04/30 가능' },
            ].map(pr => (
              <div key={pr.name} className="card">
                <b className="text-sm">{pr.name}</b>
                <div className="text-xs muted mono mt-4">{pr.desc}</div>
                <div className="row mt-12 gap-4"><button className="btn sm" style={{flex:1}}><I.edit size={12}/>수정</button><button className="btn sm ghost icon-only"><I.trash size={12}/></button></div>
              </div>
            ))}
            <div className="card" style={{borderStyle:'dashed', display:'grid', placeItems:'center', cursor:'pointer'}}>
              <div style={{textAlign:'center', color:'var(--mf)'}}>
                <I.plus size={20}/>
                <div className="text-xs mt-8">프리셋 추가</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==='profile' && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{margin:'0 0 14px', fontSize:14}}>개인 정보</h3>
            <div className="field"><label>이름</label><input className="input" defaultValue={me.name}/></div>
            <div className="field"><label>예명</label><input className="input" defaultValue={me.stage}/></div>
            <div className="field"><label>포지션</label><input className="input" defaultValue={me.pos}/></div>
            <div className="field"><label>연락처</label><input className="input" defaultValue="010-1234-5678"/></div>
            <button className="btn primary">저장</button>
          </div>
          <div className="card">
            <h3 style={{margin:'0 0 14px', fontSize:14}}>알림</h3>
            <label className="row" style={{justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
              <span className="text-sm">새 프로젝트 공지</span><Switch on={true} onChange={()=>{}}/></label>
            <label className="row" style={{justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
              <span className="text-sm">지원 결과 알림</span><Switch on={true} onChange={()=>{}}/></label>
            <label className="row" style={{justifyContent:'space-between', padding:'10px 0'}}>
              <span className="text-sm">정산 지급 알림</span><Switch on={false} onChange={()=>{}}/></label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== ANNOUNCEMENTS ========== */
function AnnouncementsPage({ go, state }) {
  return (
    <div className="page" style={{maxWidth:960}}>
      <div className="page-head">
        <div><h1><span className="serif-tag">Team</span>Announcements</h1>
        <div className="sub">공지 · 긴급 알림 · 프로젝트 전용 공지</div></div>
        <button className="btn primary"><I.plus size={14}/>새 공지</button>
      </div>
      <div className="mb-24">
        <div className="row mb-12 gap-6"><I.pin size={14}/><b className="text-sm">고정 공지</b></div>
        <div className="grid grid-2">
          {state.announcements.filter(a=>a.pinned).map(a=>(
            <div key={a.id} className="card">
              <div className="row mb-8 gap-6">
                <Badge kind="solid"><I.pin size={10}/>고정</Badge>
                <Badge kind={a.scope==='team'?'outline':''}>{a.scope==='team'?'팀':'프로젝트'}</Badge>
              </div>
              <b style={{fontSize:15, letterSpacing:'-0.01em'}}>{a.title}</b>
              <p className="text-sm muted mt-8" style={{lineHeight:1.6}}>{a.body}</p>
              <div className="mono text-xs muted mt-12">{a.at} · {a.author}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-16"><b className="text-sm">일반</b></div>
      <div className="card flush">
        {state.announcements.filter(a=>!a.pinned).map(a=>(
          <div key={a.id} style={{padding:'16px 20px', borderBottom:'1px solid var(--border)', cursor:'pointer'}}>
            <div className="row mb-4 gap-6">
              <Badge kind={a.scope==='team'?'outline':''}>{a.scope==='team'?'팀':'프로젝트'}</Badge>
              <span className="mono text-xs muted">{a.at}</span>
              <span className="mono text-xs muted">· {a.author}</span>
            </div>
            <b className="text-sm">{a.title}</b>
            <div className="text-sm muted mt-4" style={{lineHeight:1.5}}>{a.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ManagePage, MembersPage, CalendarPage, MyPage, AnnouncementsPage });
