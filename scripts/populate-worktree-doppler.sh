#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
  echo -e "${RED}Usage: $0 <worktree_number>${NC}"
  echo "Example: $0 1"
  exit 1
fi

WORKTREE_NUM=$1
DOPPLER_CONFIG="dev_personal_worktree$WORKTREE_NUM"

# Port configuration
case $WORKTREE_NUM in
  1)
    API_PORT=54321
    DB_PORT=54322
    ;;
  2)
    API_PORT=54331
    DB_PORT=54332
    ;;
  3)
    API_PORT=54341
    DB_PORT=54342
    ;;
  *)
    echo -e "${RED}Invalid worktree number. Must be 1, 2, or 3${NC}"
    exit 1
    ;;
esac

echo -e "${GREEN}=== Populating Doppler Config: $DOPPLER_CONFIG ===${NC}\n"

# Get shared secrets from dev_personal (GCP, etc.)
echo -e "${YELLOW}Copying shared secrets from dev_personal...${NC}"

GCP_PROJECT_ID=$(doppler secrets get GCP_PROJECT_ID --config dev_personal --plain 2>/dev/null)
GCP_SERVICE_ACCOUNT_KEY=$(doppler secrets get GCP_SERVICE_ACCOUNT_KEY --config dev_personal --plain 2>/dev/null)
PUBSUB_EMULATOR_HOST=$(doppler secrets get PUBSUB_EMULATOR_HOST --config dev_personal --plain 2>/dev/null)

# Set shared secrets
doppler secrets set GCP_PROJECT_ID="$GCP_PROJECT_ID" --config "$DOPPLER_CONFIG"
doppler secrets set GCP_SERVICE_ACCOUNT_KEY="$GCP_SERVICE_ACCOUNT_KEY" --config "$DOPPLER_CONFIG"
doppler secrets set PUBSUB_EMULATOR_HOST="$PUBSUB_EMULATOR_HOST" --config "$DOPPLER_CONFIG"

echo -e "${GREEN}✓ Shared secrets copied${NC}"

# Set Supabase connection URLs (ports vary per worktree)
echo -e "\n${YELLOW}Setting Supabase connection URLs for worktree $WORKTREE_NUM...${NC}"

doppler secrets set DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:$DB_PORT/postgres" --config "$DOPPLER_CONFIG"
doppler secrets set DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:$DB_PORT/postgres" --config "$DOPPLER_CONFIG"
doppler secrets set NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:$API_PORT" --config "$DOPPLER_CONFIG"

echo -e "${GREEN}✓ Supabase URLs configured${NC}"

# Placeholder for JWT keys (must be set after starting Supabase)
echo -e "\n${YELLOW}⚠ JWT keys must be set manually after starting Supabase:${NC}"
echo -e "1. Start Supabase: ${YELLOW}supabase start${NC}"
echo -e "2. Get keys: ${YELLOW}supabase status -o env | grep -E '(ANON_KEY|SERVICE_ROLE_KEY)'${NC}"
echo -e "3. Set keys:"
echo -e "   ${YELLOW}doppler secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY='<anon_key>' --config $DOPPLER_CONFIG${NC}"
echo -e "   ${YELLOW}doppler secrets set SUPABASE_SERVICE_ROLE_KEY='<service_role_key>' --config $DOPPLER_CONFIG${NC}"

echo -e "\n${GREEN}✓ Base configuration complete for $DOPPLER_CONFIG${NC}"
