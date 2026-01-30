#!/bin/bash

# Supabase Edge Functions Deployment Script
# This script deploys all Edge Functions to your Supabase project

set -e  # Exit on error

echo "🚀 Supabase Edge Functions Deployment"
echo "======================================"
echo ""

# Check if supabase CLI is available
if ! npx supabase --version &> /dev/null
then
    echo "❌ Supabase CLI not found."
    echo ""
    echo "📦 Please install Supabase CLI using one of these methods:"
    echo ""
    echo "   macOS (Homebrew):"
    echo "   brew install supabase/tap/supabase"
    echo ""
    echo "   Or use NPX directly (already available):"
    echo "   All commands in this script will use 'npx supabase'"
    echo ""
    echo "Continuing with npx..."
    echo ""
fi

# Check if logged in
echo "📋 Checking Supabase authentication..."
if ! npx supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase"
    echo "📝 Please run: npx supabase login"
    echo "   Then run this script again."
    exit 1
fi

echo "✅ Authenticated with Supabase"
echo ""

# Link project if not already linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "🔗 Linking to project jsfllqcrzqdpozkawkqc..."
    npx supabase link --project-ref jsfllqcrzqdpozkawkqc
else
    echo "✅ Project already linked"
fi

echo ""
echo "📦 Deploying Edge Functions..."
echo "--------------------------------"

# List of functions to deploy
functions=(
    "apply-migrations"
    "audio-transcription"
    "extract-contract-data"
    "gemini-files-ask"
    "generate-ai-reports"
    "generate-excel-reports"
    "generate-maintenance-plan"
    "generate-technical-schedules"
    "langextract-processor"
    "maintenance-status-checker"
    "process-contracts"
    "process-documents"
    "smart-chat"
    "vision-processor"
)

# Deploy each function
total=${#functions[@]}
current=0

for func in "${functions[@]}"; do
    current=$((current + 1))
    echo ""
    echo "[$current/$total] Deploying: $func"

    if npx supabase functions deploy $func --no-verify-jwt; then
        echo "   ✅ Successfully deployed: $func"
    else
        echo "   ⚠️  Failed to deploy: $func (continuing with others...)"
    fi
done

echo ""
echo "=================================="
echo "✨ Deployment process completed!"
echo ""
echo "📊 Summary:"
echo "   Total functions: $total"
echo ""
echo "🔍 You can verify deployment in:"
echo "   https://supabase.com/dashboard/project/jsfllqcrzqdpozkawkqc/functions"
echo ""
echo "📝 Note: Some functions may require environment variables."
echo "   Set them in: Dashboard → Functions → [Function Name] → Secrets"
echo ""
echo "Required secrets for most functions:"
echo "   - OPENAI_API_KEY"
echo "   - GEMINI_API_KEY"
echo ""