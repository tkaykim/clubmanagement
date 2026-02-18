#!/bin/bash
# ============================================================
# Club Management Platform - Team Agent Orchestrator
# tmux 기반 5개 에이전트 병렬/순차 실행 스크립트
# ============================================================
# 사용법:
#   ./scripts/team-agents.sh [phase]
#
# Phases:
#   all       - 전체 워크플로우 (기본값)
#   architect - Phase 1: 아키텍트만 실행
#   parallel  - Phase 2: 디자이너 + 백엔드 병렬 실행
#   frontend  - Phase 3: 프론트엔드 실행
#   qa        - Phase 4: QA 실행
#   iterate   - Phase 5: 반복 수정 (QA 피드백 기반)
# ============================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_NAME="club-agents"
HANDOFF_DIR="$PROJECT_DIR/.claude/handoffs"
PROMPT_DIR="$PROJECT_DIR/.claude/agents"
PHASE="${1:-all}"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[orchestrator]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# Agent Teams 환경변수 설정
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# ============================================================
# 핸드오프 완료 대기 함수
# ============================================================
wait_for_done() {
    local agent="$1"
    local done_file="$HANDOFF_DIR/.done-$agent"
    log "Waiting for ${CYAN}$agent${NC} to complete..."
    while [ ! -f "$done_file" ]; do
        sleep 5
    done
    success "$agent completed! ($(date '+%H:%M:%S'))"
}

# ============================================================
# 에이전트 실행 함수
# ============================================================
run_agent() {
    local agent_name="$1"
    local pane_name="$2"
    local prompt_file="$PROMPT_DIR/$agent_name.md"

    if [ ! -f "$prompt_file" ]; then
        error "Agent prompt file not found: $prompt_file"
        exit 1
    fi

    # 시스템 프롬프트 파일에서 frontmatter 아래 본문만 추출
    local system_prompt
    system_prompt=$(awk '/^---$/{n++; next} n>=2' "$prompt_file")

    log "Starting ${CYAN}$agent_name${NC} agent in pane ${pane_name}..."

    tmux send-keys -t "$SESSION_NAME:$pane_name" \
        "cd $PROJECT_DIR && claude --system-prompt-file $prompt_file -p \"$(cat <<PROMPT
당신은 ${agent_name} 에이전트입니다.
먼저 CLAUDE.md를 읽고, 필요한 핸드오프 문서를 모두 읽은 후 작업을 시작하세요.
작업이 완료되면 반드시 touch .claude/handoffs/.done-${agent_name} 를 실행하세요.
모든 산출물은 .claude/agents/${agent_name}.md 에 정의된 File Scope 내에서만 작성하세요.
PROMPT
)\"" C-m
}

# ============================================================
# 에이전트를 Interactive 모드로 실행 (감독 가능)
# ============================================================
run_agent_interactive() {
    local agent_name="$1"
    local pane_name="$2"
    local prompt_file="$PROMPT_DIR/$agent_name.md"

    log "Starting ${CYAN}$agent_name${NC} agent (interactive) in pane ${pane_name}..."

    tmux send-keys -t "$SESSION_NAME:$pane_name" \
        "cd $PROJECT_DIR && claude --system-prompt-file $prompt_file" C-m
}

# ============================================================
# tmux 세션 생성
# ============================================================
create_session() {
    local layout="$1"  # "single", "dual", "quad", "all"

    # 기존 세션 정리
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

    case "$layout" in
        single)
            tmux new-session -d -s "$SESSION_NAME" -n "agent" -x 200 -y 50
            ;;
        dual)
            tmux new-session -d -s "$SESSION_NAME" -n "agent1" -x 200 -y 50
            tmux split-window -h -t "$SESSION_NAME:agent1"
            tmux select-pane -t "$SESSION_NAME:agent1.0" -T "left"
            tmux select-pane -t "$SESSION_NAME:agent1.1" -T "right"
            ;;
        all)
            # 5 pane 레이아웃:
            # ┌──────────┬──────────┐
            # │architect │ designer │
            # ├──────────┼──────────┤
            # │ backend  │ frontend │
            # ├──────────┴──────────┤
            # │         qa          │
            # └─────────────────────┘
            tmux new-session -d -s "$SESSION_NAME" -n "team" -x 200 -y 60
            tmux split-window -v -t "$SESSION_NAME:team"
            tmux split-window -v -t "$SESSION_NAME:team.1"
            tmux split-window -h -t "$SESSION_NAME:team.0"
            tmux split-window -h -t "$SESSION_NAME:team.2"

            # 패인 이름 지정
            tmux select-pane -t "$SESSION_NAME:team.0" -T "architect"
            tmux select-pane -t "$SESSION_NAME:team.1" -T "designer"
            tmux select-pane -t "$SESSION_NAME:team.2" -T "backend"
            tmux select-pane -t "$SESSION_NAME:team.3" -T "frontend"
            tmux select-pane -t "$SESSION_NAME:team.4" -T "qa"

            # 균등 분할
            tmux select-layout -t "$SESSION_NAME:team" tiled
            ;;
    esac

    success "tmux session '$SESSION_NAME' created with layout: $layout"
}

# ============================================================
# Phase 실행
# ============================================================

phase_architect() {
    log "═══ Phase 1: ARCHITECT ═══"
    create_session "single"
    run_agent_interactive "architect" "agent"
    tmux attach-session -t "$SESSION_NAME"
    # architect 완료 후 리턴
    if [ -f "$HANDOFF_DIR/.done-architect" ]; then
        success "Phase 1 complete!"
    else
        warn "Architect did not signal completion. Check .claude/handoffs/.done-architect"
    fi
}

phase_parallel() {
    log "═══ Phase 2: DESIGNER + BACKEND (parallel) ═══"

    if [ ! -f "$HANDOFF_DIR/.done-architect" ]; then
        error "Architect has not completed yet! Run: ./scripts/team-agents.sh architect"
        exit 1
    fi

    create_session "dual"
    run_agent_interactive "designer" "agent1.0"
    run_agent_interactive "backend" "agent1.1"
    tmux attach-session -t "$SESSION_NAME"

    if [ -f "$HANDOFF_DIR/.done-designer" ] && [ -f "$HANDOFF_DIR/.done-backend" ]; then
        success "Phase 2 complete!"
    else
        warn "Not all agents completed. Check done files."
    fi
}

phase_frontend() {
    log "═══ Phase 3: FRONTEND ═══"

    if [ ! -f "$HANDOFF_DIR/.done-designer" ] || [ ! -f "$HANDOFF_DIR/.done-backend" ]; then
        error "Designer and/or Backend have not completed yet!"
        exit 1
    fi

    create_session "single"
    run_agent_interactive "frontend" "agent"
    tmux attach-session -t "$SESSION_NAME"

    if [ -f "$HANDOFF_DIR/.done-frontend" ]; then
        success "Phase 3 complete!"
    else
        warn "Frontend did not signal completion."
    fi
}

phase_qa() {
    log "═══ Phase 4: QA (Devil's Advocate) ═══"

    if [ ! -f "$HANDOFF_DIR/.done-frontend" ]; then
        error "Frontend has not completed yet!"
        exit 1
    fi

    create_session "single"
    run_agent_interactive "qa" "agent"
    tmux attach-session -t "$SESSION_NAME"

    if [ -f "$HANDOFF_DIR/.done-qa" ]; then
        success "Phase 4 complete!"
    else
        warn "QA did not signal completion."
    fi
}

phase_iterate() {
    log "═══ Phase 5: ITERATION (fix QA issues) ═══"

    if [ ! -f "$HANDOFF_DIR/04-qa-report.md" ]; then
        error "No QA report found!"
        exit 1
    fi

    # 반복 수정: backend + frontend 병렬
    create_session "dual"

    tmux send-keys -t "$SESSION_NAME:agent1.0" \
        "cd $PROJECT_DIR && claude --system-prompt-file $PROMPT_DIR/backend.md -p \"QA 보고서(.claude/handoffs/04-qa-report.md)를 읽고 backend 관련 CRITICAL, HIGH 이슈를 수정하세요. 수정 완료 후 touch .claude/handoffs/.done-backend-fix\"" C-m

    tmux send-keys -t "$SESSION_NAME:agent1.1" \
        "cd $PROJECT_DIR && claude --system-prompt-file $PROMPT_DIR/frontend.md -p \"QA 보고서(.claude/handoffs/04-qa-report.md)를 읽고 frontend 관련 CRITICAL, HIGH 이슈를 수정하세요. 수정 완료 후 touch .claude/handoffs/.done-frontend-fix\"" C-m

    tmux attach-session -t "$SESSION_NAME"
}

phase_all_auto() {
    log "═══ Full Pipeline (auto mode) ═══"
    log "Phase 순서: architect → designer+backend → frontend → qa"

    # Clean previous runs
    rm -f "$HANDOFF_DIR"/.done-*

    # Phase 1: Architect
    log "Starting Phase 1: Architect..."
    create_session "single"
    run_agent "architect" "agent"
    tmux attach-session -t "$SESSION_NAME"
    wait_for_done "architect"

    # Phase 2: Designer + Backend (parallel)
    log "Starting Phase 2: Designer + Backend..."
    create_session "dual"
    run_agent "designer" "agent1.0"
    run_agent "backend" "agent1.1"
    tmux attach-session -t "$SESSION_NAME"
    wait_for_done "designer"
    wait_for_done "backend"

    # Phase 3: Frontend
    log "Starting Phase 3: Frontend..."
    create_session "single"
    run_agent "frontend" "agent"
    tmux attach-session -t "$SESSION_NAME"
    wait_for_done "frontend"

    # Phase 4: QA
    log "Starting Phase 4: QA..."
    create_session "single"
    run_agent "qa" "agent"
    tmux attach-session -t "$SESSION_NAME"
    wait_for_done "qa"

    success "═══ Full Pipeline Complete! ═══"
    log "QA report: $HANDOFF_DIR/04-qa-report.md"
}

# ============================================================
# 상태 확인
# ============================================================
show_status() {
    echo ""
    echo "═══════════════════════════════════════════"
    echo "  Club Management - Agent Team Status"
    echo "═══════════════════════════════════════════"
    echo ""

    local agents=("architect" "designer" "backend" "frontend" "qa")
    local phases=("Phase 1" "Phase 2A" "Phase 2B" "Phase 3" "Phase 4")

    for i in "${!agents[@]}"; do
        local agent="${agents[$i]}"
        local phase="${phases[$i]}"
        if [ -f "$HANDOFF_DIR/.done-$agent" ]; then
            echo -e "  ${GREEN}[✓]${NC} $phase: $agent"
        else
            echo -e "  ${RED}[ ]${NC} $phase: $agent"
        fi
    done

    echo ""
    echo "Handoff documents:"
    ls -la "$HANDOFF_DIR"/*.md 2>/dev/null || echo "  (none yet)"
    echo ""
}

# ============================================================
# 메인
# ============================================================
case "$PHASE" in
    architect)  phase_architect ;;
    parallel)   phase_parallel ;;
    frontend)   phase_frontend ;;
    qa)         phase_qa ;;
    iterate)    phase_iterate ;;
    all)        phase_all_auto ;;
    status)     show_status ;;
    clean)
        rm -f "$HANDOFF_DIR"/.done-*
        rm -f "$HANDOFF_DIR"/*.md
        success "Cleaned all handoff files"
        ;;
    *)
        echo "Usage: $0 {architect|parallel|frontend|qa|iterate|all|status|clean}"
        echo ""
        echo "Phases:"
        echo "  architect  - Phase 1: Technical Architect"
        echo "  parallel   - Phase 2: Designer + Backend (parallel tmux panes)"
        echo "  frontend   - Phase 3: Frontend Developer"
        echo "  qa         - Phase 4: QA Tester (Devil's Advocate)"
        echo "  iterate    - Phase 5: Fix QA issues (Backend + Frontend parallel)"
        echo "  all        - Run full pipeline automatically"
        echo "  status     - Show current agent completion status"
        echo "  clean      - Remove all handoff files and reset"
        exit 1
        ;;
esac
