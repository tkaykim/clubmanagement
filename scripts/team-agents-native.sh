#!/bin/bash
# ============================================================
# Club Management Platform - Native Agent Teams Mode
# Claude Code의 실험적 Agent Teams 기능 사용
# (--teammate-mode tmux)
# ============================================================
# 사용법:
#   ./scripts/team-agents-native.sh
#
# 이 스크립트는 Claude Code의 빌트인 Agent Teams를 활성화하고
# tmux split-pane 모드로 실행합니다.
# Claude가 자동으로 에이전트를 생성하고 조율합니다.
# ============================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Agent Teams 실험적 기능 활성화
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

echo "═══════════════════════════════════════════════"
echo "  Club Management - Native Agent Teams"
echo "═══════════════════════════════════════════════"
echo ""
echo "Agent Teams 모드로 Claude Code를 시작합니다."
echo "Claude에게 다음과 같이 요청하세요:"
echo ""
echo '  "5개의 팀 에이전트를 생성해주세요:'
echo '   1. architect - 기술 아키텍트'
echo '   2. designer - UI/UX 디자이너'
echo '   3. backend - 백엔드 개발자'
echo '   4. frontend - 프론트엔드 개발자'
echo '   5. qa - QA 테스터 (비판적 옹호자)'
echo '   각 에이전트는 .claude/agents/ 에 정의된 역할을 따르세요."'
echo ""
echo "═══════════════════════════════════════════════"
echo ""

cd "$PROJECT_DIR"
claude --teammate-mode tmux
