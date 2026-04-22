/* OneShot Crew — Apply flow (availability submission) & Project Create */

function ApplyPage({ go, id, state, dispatch, toast }) {
  const p = state.projects.find(pp => pp.id===id);
  const me = MEMBERS.find(m => m.id===ME_ID);
  const allDates = [
    ...p.practiceDates.map(d=>({...d, kind:'practice'})),
    ...p.dates.map(d=>({...d, kind:'event'}))
  ].sort((a,b)=>a.date.localeCompare(b.date));

  // Local state: votes map keyed by date
  const init = React.useMemo(() => {
    const m = {};
    allDates.forEach(d => {
      const v = state.votes[`${p.id}:${d.date}:${ME_ID}`];
      m[d.date] = v ? { ...v, slots:[...v.slots] } : { status:'available', slots:[] };
    });
    return m;
  }, [p.id]);
  const [votes, setVotes] = React.useState(init);
  const [note, setNote] = React.useState('');
  const [expectedPay, setExpectedPay] = React.useState('yes');
  const [showCopy, setShowCopy] = React.useState(false);

  const set = (date, patch) => setVotes(v => ({ ...v, [date]: { ...v[date], ...patch } }));
  const addSlot = (date) => set(date, { slots:[...votes[date].slots, { start:'20:00', end:'23:00' }] });
  const rmSlot = (date, i) => set(date, { slots: votes[date].slots.filter((_,j)=>j!==i) });

  // copy from another project (for me)
  const copyFromProject = (fromId) => {
    const from = state.projects.find(pp => pp.id===fromId);
    const newVotes = { ...votes };
    Object.keys(newVotes).forEach(dt => {
      const fv = state.votes[`${from.id}:${dt}:${ME_ID}`];
      if (fv) newVotes[dt] = { status: fv.status, slots: fv.slots.map(s=>({...s})) };
    });
    setVotes(newVotes);
    setShowCopy(false);
    toast('다른 프로젝트의 일정을 복사했습니다');
  };

  // same-as-member (copy from a teammate, for same project)
  const [sameAsOpen, setSameAsOpen] = React.useState(false);
  const copyFromMember = (memId) => {
    const m = MEMBERS.find(mm => mm.id===memId);
    const newVotes = { ...votes };
    allDates.forEach(d => {
      const v = state.votes[`${p.id}:${d.date}:${memId}`];
      if (v) newVotes[d.date] = { status:v.status, slots: v.slots.map(s=>({...s})) };
    });
    setVotes(newVotes);
    setSameAsOpen(false);
    toast(`${m.name}의 일정과 동일하게 제출합니다`);
  };

  const allAvailable = () => {
    const nv = {};
    allDates.forEach(d => { nv[d.date] = { status:'available', slots:[] } });
    setVotes(nv);
    toast('모든 일정 가능으로 설정');
  };
  const allUnavailable = () => {
    const nv = {};
    allDates.forEach(d => { nv[d.date] = { status:'unavailable', slots:[] } });
    setVotes(nv);
    toast('모든 일정 불가로 설정');
  };

  const submit = () => {
    dispatch({ type:'SUBMIT_APPLY', projectId:p.id, votes });
    toast('지원서 및 가용성이 제출되었습니다 ✓');
    go('project', p.id);
  };

  const availCount = Object.values(votes).filter(v => v.status==='available').length;
  const maybeCount = Object.values(votes).filter(v => v.status==='maybe').length;
  const noCount    = Object.values(votes).filter(v => v.status==='unavailable').length;

  const otherProjects = state.projects.filter(pp => pp.id!==p.id && pp.practiceDates.length);
  const teammates = p.applicants.filter(a => a.memberId!==ME_ID && a.status!=='rejected');

  return (
    <div className="page" style={{maxWidth:960, paddingBottom:120}}>
      {/* Crumb */}
      <div className="row mb-16 gap-6 muted text-xs mono" style={{textTransform:'uppercase', letterSpacing:'0.08em'}}>
        <button className="btn ghost sm" style={{padding:'0 6px', height:22}} onClick={()=>go('project', p.id)}>
          <I.chevL size={12}/> 프로젝트
        </button>
        <span>/</span><span>APPLY</span>
      </div>

      {/* Summary strip */}
      <div className="card mb-24" style={{display:'flex', alignItems:'center', gap:16, padding:16}}>
        <div className="poster square" style={{width:56, height:56, flexShrink:0}}>P</div>
        <div className="flex-1">
          <div className="row gap-6 mb-4">
            <StatusBadge status={p.status}/>
            <StatusBadge status={p.type}/>
          </div>
          <div style={{fontWeight:700, fontSize:16, letterSpacing:'-0.01em'}}>{p.title}</div>
          <div className="mono text-xs muted mt-4">{p.venue} · 마감 {p.recruit_end}</div>
        </div>
        <div className="text-xs mono muted" style={{textAlign:'right'}}>
          STEP<br/>
          <span style={{fontSize:24, color:'var(--fg)', fontFamily:'var(--serif)', fontStyle:'italic'}}>2 / 2</span>
        </div>
      </div>

      {/* Step 1: Apply info */}
      <div className="card mb-16">
        <div className="row mb-16">
          <div className="mono text-xs muted" style={{letterSpacing:'0.1em'}}>STEP 01</div>
          <div className="divider flex-1" style={{margin:0, marginLeft:8}}/>
        </div>
        <h2 style={{margin:'0 0 14px', fontSize:20, letterSpacing:'-0.01em'}}>지원 정보</h2>

        <div className="grid grid-2">
          <div className="field">
            <label>이름</label>
            <input className="input" defaultValue={me.name} disabled/>
          </div>
          <div className="field">
            <label>예명</label>
            <input className="input" defaultValue={me.stage} disabled/>
          </div>
        </div>

        <div className="field">
          <label>참여 동기 / 각오 <span className="hint">선택</span></label>
          <textarea className="textarea" placeholder="이 프로젝트에 왜 참여하고 싶은지 짧게 적어주세요."/>
        </div>

        <div className="field" style={{marginBottom:0}}>
          <label>이 프로젝트 페이(₩ {fmtKRW(p.fee)} / 인)에 동의하십니까?</label>
          <div style={{marginTop:4}}>
            <Seg value={expectedPay} onChange={setExpectedPay} options={[
              { value:'yes',     label:'동의합니다' },
              { value:'partial', label:'조정 희망' },
            ]}/>
          </div>
        </div>
      </div>

      {/* Step 2: Availability */}
      <div className="card mb-16">
        <div className="row mb-16">
          <div className="mono text-xs muted" style={{letterSpacing:'0.1em'}}>STEP 02</div>
          <div className="divider flex-1" style={{margin:0, marginLeft:8}}/>
        </div>
        <div className="row mb-16" style={{justifyContent:'space-between', alignItems:'flex-end'}}>
          <div>
            <h2 style={{margin:'0 0 4px', fontSize:20, letterSpacing:'-0.01em'}}>가용성 제출</h2>
            <div className="sub text-xs mono muted">총 {allDates.length}일 · 가능 {availCount} · 부분 {maybeCount} · 불가 {noCount}</div>
          </div>
          <div className="row gap-6">
            <button className="btn sm" onClick={allAvailable}><I.check size={12}/>모두 가능</button>
            <button className="btn sm" onClick={allUnavailable}><I.x size={12}/>모두 불가</button>
          </div>
        </div>

        {/* Copy shortcuts */}
        <div className="card" style={{background:'var(--muted)', border:'1px dashed var(--border-2)', padding:12, marginBottom:16}}>
          <div className="row" style={{justifyContent:'space-between', gap:8, flexWrap:'wrap'}}>
            <div className="row gap-8">
              <I.copy size={14}/>
              <span className="text-sm"><b>일정 복사 · 동일일정 제출</b> <span className="muted" style={{marginLeft:6, fontSize:12}}>클릭 수 최소화</span></span>
            </div>
            <div className="row gap-6">
              <button className="btn sm" onClick={()=>setShowCopy(true)}><I.copy size={12}/>다른 프로젝트에서 복사</button>
              <button className="btn sm" onClick={()=>setSameAsOpen(true)}><I.users size={12}/>멤버와 동일하게</button>
            </div>
          </div>
        </div>

        {/* Schedule list */}
        <div className="sched">
          {allDates.map(d => {
            const v = votes[d.date];
            const dt = new Date(d.date);
            return (
              <div key={d.date} className="sched-row">
                <div className="date-col">
                  <div className="d tabnum">{pad2(dt.getDate())}</div>
                  <div className="dow">{DOW_FULL[dt.getDay()]}</div>
                  <div className="mono text-xs muted mt-4">{d.date.slice(0,7)}</div>
                  <div className="mt-8">
                    {d.kind==='event'
                      ? <Badge kind="solid">{d.label || 'EVENT'}</Badge>
                      : <Badge kind="outline">연습</Badge>}
                  </div>
                </div>
                <div className="body">
                  <Seg full value={v.status} onChange={(s)=>set(d.date, { status: s, slots: s==='unavailable' ? [] : v.slots })} options={[
                    { value:'available',   label:'가능' },
                    { value:'maybe',       label:'부분' },
                    { value:'unavailable', label:'불가' },
                  ]}/>
                  {v.status !== 'unavailable' && (
                    <div className="timeslots">
                      {v.slots.map((s,i) => (
                        <div key={i} className="slot">
                          <input type="time" value={s.start} onChange={e => {
                            const ns = [...v.slots]; ns[i] = {...ns[i], start:e.target.value}; set(d.date, { slots:ns });
                          }} style={{border:0, background:'transparent', width:54, fontFamily:'var(--mono)', fontSize:11.5}}/>
                          <span className="muted">—</span>
                          <input type="time" value={s.end} onChange={e => {
                            const ns = [...v.slots]; ns[i] = {...ns[i], end:e.target.value}; set(d.date, { slots:ns });
                          }} style={{border:0, background:'transparent', width:54, fontFamily:'var(--mono)', fontSize:11.5}}/>
                          <span className="x" onClick={()=>rmSlot(d.date,i)}><I.close size={12}/></span>
                        </div>
                      ))}
                      <div className="slot add" onClick={()=>addSlot(d.date)}>
                        <I.plus size={12}/>시간대 추가
                      </div>
                    </div>
                  )}
                  {v.status !== 'unavailable' && !v.slots.length && (
                    <div className="text-xs muted">시간대를 지정하지 않으면 하루 종일 가능으로 간주됩니다.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="field mt-16" style={{marginBottom:0}}>
          <label>전체 메모 <span className="hint">선택</span></label>
          <textarea className="textarea" value={note} onChange={e=>setNote(e.target.value)}
            placeholder="운영진이 참고할 메모 (예: 5/16은 오후 6시 이후만 가능)"/>
        </div>
      </div>

      {/* Sticky submit */}
      <div style={{position:'sticky', bottom:0, background:'rgba(250,250,250,0.92)',
        backdropFilter:'blur(8px)', borderTop:'1px solid var(--border)',
        margin:'0 -28px', padding:'16px 28px', display:'flex', gap:12, alignItems:'center'}}>
        <div className="flex-1 text-sm">
          <b>요약</b> — 전체 {allDates.length}일 중 가능 <b className="tabnum">{availCount}</b> · 부분 <b className="tabnum">{maybeCount}</b> · 불가 <b className="tabnum">{noCount}</b>
        </div>
        <button className="btn" onClick={()=>go('project', p.id)}>취소</button>
        <button className="btn primary lg" onClick={submit}>
          지원 및 가용성 제출 <I.send size={14}/>
        </button>
      </div>

      {showCopy && (
        <Modal title="다른 프로젝트에서 일정 복사" onClose={()=>setShowCopy(false)}>
          <div className="text-sm muted mb-16">같은 날짜가 있는 프로젝트의 가용성을 자동으로 이 프로젝트에 복사합니다.</div>
          {otherProjects.map(pp => (
            <div key={pp.id} className="card" style={{padding:12, marginBottom:8, cursor:'pointer'}}
                 onClick={()=>copyFromProject(pp.id)}>
              <div className="row" style={{justifyContent:'space-between'}}>
                <div>
                  <b className="text-sm">{pp.title}</b>
                  <div className="mono text-xs muted mt-4">
                    {pp.practiceDates.length + pp.dates.length}일 · {pp.practiceDates[0]?.date || pp.dates[0]?.date}
                  </div>
                </div>
                <I.arrowR size={14}/>
              </div>
            </div>
          ))}
        </Modal>
      )}

      {sameAsOpen && (
        <Modal title="멤버와 동일하게 제출" onClose={()=>setSameAsOpen(false)}>
          <div className="text-sm muted mb-16">선택한 멤버와 같은 가용성으로 자동 채워집니다. (제출 전 수정 가능)</div>
          {teammates.map(a => {
            const m = MEMBERS.find(mm => mm.id===a.memberId);
            return (
              <div key={a.memberId} className="row" style={{padding:10, border:'1px solid var(--border)', borderRadius:8, marginBottom:8, gap:12, cursor:'pointer'}}
                   onClick={()=>copyFromMember(a.memberId)}>
                <Avatar name={m.name}/>
                <div className="flex-1">
                  <div className="text-sm" style={{fontWeight:500}}>{m.name} <span className="muted" style={{fontSize:11}}>· {m.pos}</span></div>
                  <div className="mono text-xs muted">{m.stage}</div>
                </div>
                <StatusBadge status={a.status}/>
                <I.arrowR size={14}/>
              </div>
            );
          })}
        </Modal>
      )}
    </div>
  );
}

/* ========== Project CREATE form ========== */
function ProjectNew({ go, dispatch, toast }) {
  const [form, setForm] = React.useState({
    title:'', type:'paid_gig', fee:300000, venue:'', address:'',
    desc:'', scheduleUndecided:false, max:10, recruit_end:'2026-05-31',
    dates:[{ date:'2026-05-16', label:'본공연' }],
    practiceDates:[
      { date:'2026-05-01' }, { date:'2026-05-08' }, { date:'2026-05-14' },
    ],
  });
  const set = patch => setForm(f => ({...f, ...patch}));

  const addEvent = () => set({ dates:[...form.dates, { date:'', label:'' }] });
  const rmEvent = i => set({ dates: form.dates.filter((_,j)=>j!==i) });
  const addPractice = () => set({ practiceDates:[...form.practiceDates, { date:'' }] });
  const rmPractice = i => set({ practiceDates: form.practiceDates.filter((_,j)=>j!==i) });
  const addWeekly = () => {
    // generate weekly dates (4 weeks from today)
    const out = [];
    for (let i=0;i<4;i++) out.push({ date: dateKey(addDays(TODAY, 7*(i+1))) });
    set({ practiceDates:[...form.practiceDates, ...out] });
    toast('매주 같은 요일 연습일정 4주치 추가');
  };

  const submit = () => {
    dispatch({ type:'CREATE_PROJECT', project: form });
    toast('프로젝트가 생성되었습니다');
    go('projects');
  };

  return (
    <div className="page" style={{maxWidth:880}}>
      <div className="row mb-16 gap-6 muted text-xs mono" style={{textTransform:'uppercase', letterSpacing:'0.08em'}}>
        <button className="btn ghost sm" style={{padding:'0 6px', height:22}} onClick={()=>go('projects')}>
          <I.chevL size={12}/> 프로젝트
        </button>
        <span>/</span><span>NEW</span>
      </div>

      <div className="page-head">
        <div>
          <h1><span className="serif-tag">Create</span>New Project</h1>
          <div className="sub">프로젝트 유형·일정·연습일정·모집조건을 한 번에 설정합니다.</div>
        </div>
      </div>

      {/* Basic */}
      <div className="card mb-16">
        <h3 style={{margin:'0 0 14px', fontSize:14}}>기본</h3>
        <div className="field">
          <label>제목 <span className="req">*</span></label>
          <input className="input" placeholder="예: 원샷크루 5월 정기공연 〈FRAME〉"
                 value={form.title} onChange={e=>set({title:e.target.value})}/>
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label>유형 <span className="req">*</span></label>
            <Seg value={form.type} onChange={t=>set({type:t})} full options={[
              { value:'paid_gig', label:'유료행사' },
              { value:'practice', label:'연습' },
              { value:'audition', label:'오디션' },
              { value:'workshop', label:'워크숍' },
            ]}/>
          </div>
          <div className="field">
            <label>
              {form.fee >= 0 ? '1인 페이' : '1인 참가비'}
              <span className="hint">음수면 참가비</span>
            </label>
            <input className="input tabnum" type="number" step="10000" value={form.fee}
                   onChange={e=>set({fee:Number(e.target.value)})}/>
          </div>
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label>장소 이름</label>
            <input className="input" value={form.venue} onChange={e=>set({venue:e.target.value})}
                   placeholder="예: 성수 S팩토리 B홀"/>
          </div>
          <div className="field">
            <label>주소</label>
            <input className="input" value={form.address} onChange={e=>set({address:e.target.value})}
                   placeholder="서울 성동구 성수이로 123"/>
          </div>
        </div>
        <div className="field" style={{marginBottom:0}}>
          <label>설명</label>
          <textarea className="textarea" value={form.desc} onChange={e=>set({desc:e.target.value})}
            placeholder="프로젝트 배경, 기대사항, 주의점 등" rows={3}/>
        </div>
      </div>

      {/* Dates */}
      <div className="card mb-16">
        <div className="row mb-12" style={{justifyContent:'space-between'}}>
          <h3 style={{margin:0, fontSize:14}}>프로젝트 일정</h3>
          <div className="row gap-8">
            <label className="row gap-6 text-xs muted">
              <Switch on={form.scheduleUndecided} onChange={b=>set({scheduleUndecided:b})}/>
              일정 미정
            </label>
          </div>
        </div>
        {!form.scheduleUndecided && (
          <>
            <div className="sched" style={{marginBottom:10}}>
              {form.dates.map((d,i) => (
                <div key={i} className="sched-row" style={{gridTemplateColumns:'180px 1fr 1fr 60px'}}>
                  <div className="date-col">
                    <div className="mono text-xs muted">EVENT #{i+1}</div>
                  </div>
                  <div className="body" style={{padding:10}}>
                    <input className="input" type="date" value={d.date}
                           onChange={e=>{ const nd=[...form.dates]; nd[i]={...nd[i],date:e.target.value}; set({dates:nd}); }}/>
                  </div>
                  <div className="body" style={{padding:10}}>
                    <input className="input" placeholder="라벨 (예: 리허설, 본공연)" value={d.label}
                           onChange={e=>{ const nd=[...form.dates]; nd[i]={...nd[i],label:e.target.value}; set({dates:nd}); }}/>
                  </div>
                  <div className="body" style={{padding:10, alignItems:'center', flexDirection:'row', justifyContent:'center'}}>
                    <button className="btn ghost icon-only sm" onClick={()=>rmEvent(i)}><I.trash size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn sm" onClick={addEvent}><I.plus size={12}/>일정 추가</button>
          </>
        )}
      </div>

      {/* Practice */}
      <div className="card mb-16">
        <div className="row mb-12" style={{justifyContent:'space-between'}}>
          <h3 style={{margin:0, fontSize:14}}>연습 일정</h3>
          <div className="row gap-6">
            <button className="btn sm" onClick={addWeekly}><I.copy size={12}/>매주 복제 (4주)</button>
          </div>
        </div>
        <div className="grid" style={{gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
          {form.practiceDates.map((d,i) => (
            <div key={i} className="row gap-6" style={{border:'1px solid var(--border)', borderRadius:8, padding:'4px 4px 4px 10px'}}>
              <input type="date" value={d.date} style={{border:0, flex:1, fontFamily:'var(--mono)', fontSize:12, outline:'none', background:'transparent'}}
                     onChange={e=>{ const nd=[...form.practiceDates]; nd[i]={date:e.target.value}; set({practiceDates:nd}); }}/>
              <button className="btn ghost icon-only sm" onClick={()=>rmPractice(i)}><I.close size={12}/></button>
            </div>
          ))}
          <button className="btn" onClick={addPractice} style={{borderStyle:'dashed', justifyContent:'center'}}>
            <I.plus size={12}/>연습일 추가
          </button>
        </div>
      </div>

      {/* Recruit */}
      <div className="card mb-24">
        <h3 style={{margin:'0 0 14px', fontSize:14}}>모집 조건</h3>
        <div className="grid grid-3">
          <div className="field">
            <label>모집 마감일</label>
            <input className="input" type="date" value={form.recruit_end}
                   onChange={e=>set({recruit_end:e.target.value})}/>
          </div>
          <div className="field">
            <label>정원</label>
            <input className="input tabnum" type="number" value={form.max}
                   onChange={e=>set({max:Number(e.target.value)})}/>
          </div>
          <div className="field">
            <label>게스트 허용</label>
            <div className="mt-4"><Switch on={true} onChange={()=>{}}/></div>
          </div>
        </div>
      </div>

      <div className="row" style={{justifyContent:'flex-end', gap:8}}>
        <button className="btn" onClick={()=>go('projects')}>취소</button>
        <button className="btn" onClick={()=>{toast('임시저장 되었습니다'); go('projects');}}>임시저장</button>
        <button className="btn primary lg" onClick={submit}>
          프로젝트 생성 · 관리로 이동 <I.arrowR size={14}/>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ApplyPage, ProjectNew });
