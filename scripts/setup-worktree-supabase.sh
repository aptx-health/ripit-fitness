#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Supabase Worktree Setup ===${NC}\n"

# Detect worktree number by checking git worktree path
REPO_PATH=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_PATH")

# Determine worktree number
if [[ "$REPO_NAME" == "fitcsv" ]]; then
  WORKTREE_NUM=1
  echo -e "${GREEN}Detected: Primary worktree (wt1)${NC}"
elif [[ "$REPO_NAME" =~ fitcsv.*-wt2 ]] || [[ "$REPO_NAME" =~ fitcsv-2 ]]; then
  WORKTREE_NUM=2
  echo -e "${GREEN}Detected: Worktree 2 (wt2)${NC}"
elif [[ "$REPO_NAME" =~ fitcsv.*-wt3 ]] || [[ "$REPO_NAME" =~ fitcsv-3 ]]; then
  WORKTREE_NUM=3
  echo -e "${GREEN}Detected: Worktree 3 (wt3)${NC}"
else
  echo -e "${YELLOW}Could not auto-detect worktree number from path: $REPO_PATH${NC}"
  read -p "Enter worktree number (1, 2, or 3): " WORKTREE_NUM
fi

# Port configuration
case $WORKTREE_NUM in
  1)
    API_PORT=54321
    DB_PORT=54322
    STUDIO_PORT=54323
    DOPPLER_CONFIG="dev_personal_worktree1"
    ;;
  2)
    API_PORT=54331
    DB_PORT=54332
    STUDIO_PORT=54333
    DOPPLER_CONFIG="dev_personal_worktree2"
    ;;
  3)
    API_PORT=54341
    DB_PORT=54342
    STUDIO_PORT=54343
    DOPPLER_CONFIG="dev_personal_worktree3"
    ;;
  *)
    echo -e "${RED}Invalid worktree number. Must be 1, 2, or 3${NC}"
    exit 1
    ;;
esac

echo -e "\n${GREEN}Configuration for worktree $WORKTREE_NUM:${NC}"
echo "  API Port:    $API_PORT"
echo "  DB Port:     $DB_PORT"
echo "  Studio Port: $STUDIO_PORT"
echo "  Doppler:     $DOPPLER_CONFIG"

# Update supabase/config.toml with correct ports
echo -e "\n${YELLOW}Updating supabase/config.toml with ports...${NC}"
if [ ! -f "supabase/config.toml" ]; then
  echo -e "${RED}Error: supabase/config.toml not found. Run 'supabase init' first.${NC}"
  exit 1
fi

# Update ports in config.toml
sed -i.bak "s/^port = 54321$/port = $API_PORT/" supabase/config.toml
sed -i.bak "s/^port = 54322$/port = $DB_PORT/" supabase/config.toml
sed -i.bak "s/^port = 54323$/port = $STUDIO_PORT/" supabase/config.toml
rm supabase/config.toml.bak

echo -e "${GREEN}✓ Updated supabase/config.toml${NC}"

# Configure Doppler
echo -e "\n${YELLOW}Configuring Doppler...${NC}"
doppler configure set project fitcsv
doppler configure set config "$DOPPLER_CONFIG"
echo -e "${GREEN}✓ Doppler configured to use $DOPPLER_CONFIG${NC}"

# Check if Doppler secrets are populated
SECRET_COUNT=$(doppler secrets --config "$DOPPLER_CONFIG" 2>/dev/null | grep -c "│" | awk '{print $1}')
if [ "$SECRET_COUNT" -lt 5 ]; then
  echo -e "\n${YELLOW}⚠ Doppler config $DOPPLER_CONFIG needs to be populated with secrets${NC}"
  echo -e "${YELLOW}Run the populate script: ./scripts/populate-worktree-doppler.sh $WORKTREE_NUM${NC}"
fi

# Instructions for starting Supabase
echo -e "\n${GREEN}=== Next Steps ===${NC}"
echo -e "1. Start Supabase: ${YELLOW}supabase start${NC}"
echo -e "2. Get JWT keys and update Doppler:"
echo -e "   ${YELLOW}supabase status -o env | grep -E '(ANON_KEY|SERVICE_ROLE_KEY)'${NC}"
echo -e "   ${YELLOW}doppler secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY='<value>' --config $DOPPLER_CONFIG${NC}"
echo -e "   ${YELLOW}doppler secrets set SUPABASE_SERVICE_ROLE_KEY='<value>' --config $DOPPLER_CONFIG${NC}"
echo -e "3. Start all services: ${YELLOW}overmind start${NC}"
echo -e "\n${GREEN}Supabase Studio will be available at: ${YELLOW}http://127.0.0.1:$STUDIO_PORT${NC}"
