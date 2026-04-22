/* OneShot Crew — Dashboard, Projects list, Project detail */

function Dashboard({ go, state }) {
  const { projects, announcements } = state;
  const me = MEMBERS.find(m => m.id===ME_ID);
  const myApplications = projects.flatMap(p =>
    p.applicants.filter(a => a.memberId===ME_ID).map(a => ({ ...a, project:p }))
  );
  const pending = myApplications.filter(a => a.status==='pending').length;
  const approved = myApplications.filter(a => a.status==='approved');
  const unreadNotices = announcements.filter(a => a.pinned).length;
  const activeProjects = projects.filter(p => p.status==='recruiting' || p.status==='in_progress');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono text-xs muted" style={{letterSpacing:'0.1em', textTransform:'uppercase'}}>
            {TODAY.getFullYear()}.{pad2(TODAY.getMonth()+1)}.{pad2(TODAY.getDate())} · {DOW_FULL[TODAY.getDay()]}
          </div>
          <h1 style={{marginTop:4}}>
            <span className="serif-tag">Good evening,</span>
            {me.name}
          </h1>
          <div className="sub">오늘 확인해야 할 3가지</div>
        </div>
        <div className="row gap-8">
          <button className="btn" onClick={()=>go('calendar')}><I.calendar size={14}/>캘린더</button>
          <button className="btn primary" onClick={()=>go('projects')}><I.folder size={14}/>프로젝트 전체보기</button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-4 mb-24">
        <div className="card" style={{cursor:'pointer'}} onClick={()=>go('mypage')}>
          <div className="stat">
            <div className="lab">지원 대기</div>
            <div className="num">{pending}<span style={{fontSize:14, color:'var(--mf)', marginLeft:6}}>건</span></div>
            <div className="delta">▲ 응답 대기중</div>
          </div>
        </div>
        <div className="card" style={{cursor:'pointer'}} onClick={()=>go('calendar')}>
          <div className="stat">
            <div className="lab">다가오는 확정</div>
            <div className="num">{approved.length}</div>
            <div className="delta">가장 가까운 일정 04.23</div>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <div className="lab">미확인 공지</div>
            <div className="num">{unreadNotices}</div>
            <div className="delta">고정 공지 {unreadNotices}건</div>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <div className="lab">이번 달 예상 페이</div>
            <div className="num">₩ 850<span style={{fontSize:14, color:'var(--mf)', marginLeft:6}}>만</span></div>
            <div className="delta">정산 예정 2건</div>
          </div>
        </div>
      </div>

      {/* Pinned announcements */}
      <div className="mb-24">
        <div className="row mb-12" style={{justifyContent:'space-between'}}>
          <div className="row gap-8"><I.pin size={14}/><b className="text-sm">고정 공지</b></div>
          <button className="btn ghost sm" onClick={()=>go('announcements')}>전체보기 <I.arrowR size={12}/></button>
        </div>
        <div className="grid grid-2">
          {announcements.filter(a=>a.pinned).map(a => (
            <div key={a.id} className="banner" onClick={()=>go('announcement', a.id)} style={{cursor:'pointer'}}>
              <I.bell/>
              <div className="flex-1">
                <div style={{fontWeight:600, fontSize:14}}>{a.title}</div>
                <div style={{fontSize:11.5, opacity:0.7, fontFamily:'var(--mono)', marginTop:2}}>
                  {a.at} · {a.author}
                </div>
              </div>
              <I.arrowR size={14}/>
            </div>
          ))}
        </div>
      </div>

      {/* Active projects */}
      <div className="mb-24">
        <div className="row mb-12" style={{justifyContent:'space-between'}}>
          <div className="row gap-8"><I.sparkles size={14}/><b className="text-sm">진행 중 프로젝트</b></div>
          <button className="btn ghost sm" onClick={()=>go('projects')}>전체보기 <I.arrowR size={12}/></button>
        </div>
        <div className="grid grid-2">
          {activeProjects.map(p => <ProjectCard key={p.id} project={p} go={go}/>)}
        </div>
      </div>

      {/* Past */}
      <div>
        <div className="row mb-12"><I.clock size={14}/><b className="text-sm">지난 프로젝트</b></div>
        <div className="card flush">
          {projects.filter(p=>p.status==='completed').map(p => (
            <div key={p.id} style={{padding:'14px 18px', borderBottom:'1px solid var(--border)',
              display:'flex', alignItems:'center', gap:16, opacity:0.8, cursor:'pointer'}} onClick={()=>go('project', p.id)}>
              <div className="mono text-xs muted">{p.dates[0]?.date || '—'}</div>
              <div className="flex-1 text-sm" style={{fontWeight:500}}>{p.title}</div>
              <StatusBadge status={p.status}/>
            </div>
          ))}
          {!projects.some(p=>p.status==='completed') && <div className="empty">지난 프로젝트가 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project: p, go }) {
  const confirmedCount = p.applicants.filter(a=>a.status==='approved').length;
  const pendingCount   = p.applicants.filter(a=>a.status==='pending').length;
  const mine = p.applicants.find(a => a.memberId===ME_ID);
  const firstDate = p.dates[0]?.date || p.practiceDates[0]?.date;
  const confirmed = p.applicants.filter(a=>a.status==='approved').slice(0,5);

  return (
    <div className="card flush" style={{cursor:'pointer', transition:'border-color 150ms'}}
         onMouseEnter={e=>e.currentTarget.style.borderColor='var(--fg)'}
         onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
         onClick={()=>go('project', p.id)}>
      <div className="poster" style={{aspectRatio:'21/10', borderRadius:'0', border:'none', borderBottom:'1px solid var(--border)'}}>
        {p.type === 'paid_gig' ? 'POSTER · PAID GIG' : p.type === 'practice' ? 'POSTER · PRACTICE' : 'POSTER · AUDITION'}
      </div>
      <div style={{padding:16}}>
        <div className="row gap-6 mb-8">
          <StatusBadge status={p.status}/>
          <StatusBadge status={p.type}/>
          {p.type==='paid_gig' && <Badge kind="outline">₩ {fmtKRW(p.fee)}</Badge>}
        </div>
        <div style={{fontSize:16, fontWeight:700, letterSpacing:'-0.01em', lineHeight:1.3, marginBottom:10}}>
          {p.title}
        </div>
        <dl className="kv" style={{gap:'6px 16px'}}>
          <dt>DATE</dt><dd className="mono text-xs">{firstDate || '미정'}{p.dates.length>1 && ` +${p.dates.length-1}`}</dd>
          <dt>VENUE</dt><dd className="text-xs">{p.venue}</dd>
        </dl>
        <div className="divider" style={{margin:'12px 0'}}/>
        <div className="row" style={{justifyContent:'space-between'}}>
          <div className="row gap-8">
            <div className="av-stack">
              {confirmed.map((a,i) => {
                const m = MEMBERS.find(mm=>mm.id===a.memberId);
                return <Avatar key={i} name={m.name} size="sm"/>;
              })}
            </div>
            <span className="text-xs mono muted">확정 {confirmedCount}{p.max?`/${p.max}`:''} · 대기 {pendingCount}</span>
          </div>
          {mine ? <StatusBadge status={mine.status}/> :
            <button className="btn sm primary" onClick={(e)=>{e.stopPropagation(); go('apply', p.id);}}>지원하기</button>}
        </div>
      </div>
    </div>
  );
}

function ProjectList({ go, state }) {
  const [tab, setTab] = React.useState('active');
  const [filter, setFilter] = React.useState('all');
  const tabs = {
    active:   state.projects.filter(p => p.status==='recruiting' || p.status==='in_progress'),
    past:     state.projects.filter(p => p.status==='completed' || p.status==='cancelled'),
    draft:    [],
  };
  let list = tabs[tab];
  if (filter !== 'all') list = list.filter(p => p.type === filter);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1><span className="serif-tag">All</span>Projects</h1>
          <div className="sub">진행중 · 지난 · 임시 저장 프로젝트 관리</div>
        </div>
        <div className="row gap-8">
          <button className="btn" onClick={()=>go('calendar')}><I.calendar size={14}/>캘린더</button>
          <button className="btn primary" onClick={()=>go('projectNew')}><I.plus size={14}/>새 프로젝트</button>
        </div>
      </div>

      <div className="row mb-24" style={{justifyContent:'space-between'}}>
        <Seg value={tab} onChange={setTab} options={[
          { value:'active', label:`진행중 (${tabs.active.length})` },
          { value:'past',   label:`지난 (${tabs.past.length})` },
          { value:'draft',  label:`임시 (${tabs.draft.length})` },
        ]}/>
        <div className="row gap-8">
          <select className="select" style={{width:160, height:34}} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="all">유형 전체</option>
            <option value="paid_gig">유료행사</option>
            <option value="practice">연습</option>
            <option value="audition">오디션</option>
            <option value="workshop">워크숍</option>
          </select>
        </div>
      </div>

      {list.length ? (
        <div className="grid grid-2">
          {list.map(p => <ProjectCard key={p.id} project={p} go={go}/>)}
        </div>
      ) : (
        <div className="card empty">
          <I.folder className="ico"/>
          <div>해당 탭에 프로젝트가 없습니다.</div>
          {tab==='draft' &&
            <button className="btn mt-12" onClick={()=>go('projectNew')}><I.plus size={14}/>새 프로젝트 만들기</button>}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ go, id, state, dispatch }) {
  const p = state.projects.find(pp => pp.id===id);
  if (!p) return <div className="page">프로젝트를 찾을 수 없습니다.</div>;

  const mine = p.applicants.find(a => a.memberId===ME_ID);
  const confirmed = p.applicants.filter(a=>a.status==='approved');

  return (
    <div className="page" style={{maxWidth:1080}}>
      {/* Back crumb */}
      <div className="row mb-16 gap-6 muted text-xs mono" style={{textTransform:'uppercase', letterSpacing:'0.08em'}}>
        <button className="btn ghost sm" style={{padding:'0 6px', height:22}} onClick={()=>go('projects')}>
          <I.chevL size={12}/> 프로젝트
        </button>
        <span>/</span>
        <span>{p.id}</span>
      </div>

      {/* Hero */}
      <div style={{position:'relative', marginBottom:24, borderRadius:'var(--radius)', overflow:'hidden', border:'1px solid var(--border)'}}>
        <div className="poster" style={{aspectRatio:'21/8', border:'none', borderRadius:0}}>
          POSTER · 2880 × 1080
        </div>
        <div style={{position:'absolute', left:24, bottom:24, right:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:16}}>
          <div>
            <div className="row gap-6 mb-8">
              <StatusBadge status={p.status}/>
              <StatusBadge status={p.type}/>
            </div>
            <h1 style={{margin:0, fontSize:30, letterSpacing:'-0.02em', lineHeight:1.1}}>{p.title}</h1>
          </div>
          <div className="row gap-8">
            <button className="btn" onClick={()=>go('manage', p.id)}><I.settings size={14}/>관리</button>
            {!mine && p.status==='recruiting' && (
              <button className="btn primary lg" onClick={()=>go('apply', p.id)}>
                지원+가용성 제출 <I.arrowR size={14}/>
              </button>
            )}
            {mine && <StatusBadge status={mine.status}/>}
          </div>
        </div>
      </div>

      {/* Confirmed banner for me */}
      {mine?.status==='approved' && (
        <div className="banner mb-24">
          <I.check/>
          <div className="flex-1">
            <b>확정되었습니다.</b>
            <span style={{opacity:0.7, marginLeft:8, fontSize:12.5}}>일정을 개인 캘린더에 추가하세요.</span>
          </div>
          <button className="btn sm" style={{background:'#fff', color:'var(--fg)'}}><I.calendar size={12}/>캘린더 추가</button>
        </div>
      )}
      {mine?.status==='pending' && (
        <div className="banner soft mb-24">
          <I.clock/>
          <div className="flex-1">
            <b>심사 대기중.</b>
            <span className="muted" style={{marginLeft:8, fontSize:12.5}}>지원을 수정할 수 있습니다.</span>
          </div>
          <button className="btn sm" onClick={()=>go('apply', p.id)}><I.edit size={12}/>지원 수정</button>
        </div>
      )}
      {mine?.status==='rejected' && (
        <div className="banner mb-24" style={{background:'#FEF2F2', color:'var(--danger)', border:'1px solid #FCA5A5'}}>
          <I.x/>
          <div className="flex-1">
            <b>이번 프로젝트는 탈락입니다.</b>
            <span style={{marginLeft:8, fontSize:12.5, opacity:0.8}}>다음 기회를 기다려주세요. 문의는 운영진에게.</span>
          </div>
        </div>
      )}

      <div className="grid" style={{gridTemplateColumns:'1fr 320px'}}>
        <div>
          {/* Meta box */}
          <div className="card mb-16">
            <dl className="kv" style={{gridTemplateColumns:'max-content 1fr max-content 1fr', gap:'12px 32px'}}>
              <dt>일정</dt>
              <dd>
                {p.dates.length
                  ? p.dates.map(d => <div key={d.date} className="text-sm">{d.date} <span className="muted">· {d.label}</span></div>)
                  : <span className="muted">미정</span>}
              </dd>
              <dt>연습일</dt>
              <dd className="mono text-sm">{p.practiceDates.length}일 <span className="muted" style={{fontSize:11}}>({p.practiceDates[0]?.date} ~ {p.practiceDates.at(-1)?.date})</span></dd>
              <dt>장소</dt>
              <dd>
                <div className="text-sm">{p.venue}</div>
                <div className="text-xs muted mono">{p.address}</div>
              </dd>
              <dt>{p.fee >= 0 ? '페이' : '참가비'}</dt>
              <dd className="tabnum">
                <b>₩ {fmtKRW(Math.abs(p.fee))}</b>
                <span className="muted text-xs" style={{marginLeft:6}}>/인</span>
              </dd>
              <dt>마감</dt>
              <dd className="mono text-sm">{p.recruit_end}</dd>
              <dt>정원</dt>
              <dd className="tabnum text-sm">확정 {confirmed.length} / {p.max ?? '∞'}</dd>
            </dl>
          </div>

          {/* Description */}
          <div className="card mb-16">
            <h3 style={{margin:'0 0 12px', fontSize:14}}>설명</h3>
            <p className="text-sm" style={{lineHeight:1.7, color:'var(--fg-soft)', margin:0}}>{p.desc}</p>
          </div>

          {/* Schedule timeline */}
          <div className="card flush">
            <div className="card-head">
              <h3>일정 · 연습 타임라인</h3>
              <span className="hint">{p.practiceDates.length + p.dates.length}일</span>
            </div>
            <div>
              {[...p.practiceDates.map(d=>({...d, kind:'practice'})),
                ...p.dates.map(d=>({...d, kind:'event'}))]
                .sort((a,b)=>a.date.localeCompare(b.date))
                .map(d => (
                <div key={d.date+d.kind} style={{padding:'12px 18px', borderBottom:'1px solid var(--border)',
                  display:'flex', alignItems:'center', gap:16}}>
                  <div className="mono text-sm" style={{width:100, fontWeight:500}}>
                    {d.date.slice(5)}
                    <span className="muted" style={{marginLeft:6}}>
                      {DOW_SHORT[new Date(d.date).getDay()]}
                    </span>
                  </div>
                  <div className="flex-1 text-sm">
                    {d.kind==='event' ? <b>{d.label || '본행사'}</b> : <span className="muted">연습</span>}
                  </div>
                  <Badge kind={d.kind==='event' ? 'solid' : 'outline'}>
                    {d.kind==='event' ? 'EVENT' : 'PRACTICE'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side */}
        <div>
          <div className="card mb-16">
            <div className="row mb-12" style={{justifyContent:'space-between'}}>
              <b className="text-sm">확정 멤버</b>
              <span className="mono text-xs muted">{confirmed.length}명</span>
            </div>
            {confirmed.map(a => {
              const m = MEMBERS.find(mm => mm.id===a.memberId);
              return (
                <div key={a.memberId} className="row mb-8" style={{gap:10}}>
                  <Avatar name={m.name}/>
                  <div className="flex-1 text-sm">
                    <div style={{fontWeight:500}}>{m.name} <span className="muted" style={{fontSize:11}}>· {m.pos}</span></div>
                    <div className="mono muted text-xs">{m.stage}</div>
                  </div>
                </div>
              );
            })}
            {!confirmed.length && <div className="muted text-xs">아직 확정 멤버가 없습니다.</div>}
          </div>

          <div className="card">
            <div className="row mb-8"><I.bell size={14}/><b className="text-sm">프로젝트 공지</b></div>
            {state.announcements.filter(a=>a.project===p.id).map(a => (
              <div key={a.id} style={{padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
                <div className="text-sm" style={{fontWeight:500}}>{a.title}</div>
                <div className="mono text-xs muted mt-4">{a.at}</div>
              </div>
            ))}
            {!state.announcements.some(a=>a.project===p.id) &&
              <div className="muted text-xs">이 프로젝트 공지가 없습니다.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, ProjectList, ProjectDetail, ProjectCard });
