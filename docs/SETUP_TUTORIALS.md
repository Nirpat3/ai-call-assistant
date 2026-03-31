# Step-by-Step Setup Tutorials

## Tutorial 1: Complete System Setup (15 minutes)

### Step 1: Access Your Dashboard
1. Open your web browser
2. Navigate to your AI Call Assistant URL
3. You'll see the main dashboard immediately
4. ✅ **Checkpoint**: Dashboard shows "Live Call Monitor" and "Quick Stats"

### Step 2: Customize Your AI Greeting
1. Click "AI Config" in the navigation menu
2. Find the "Greeting" text box
3. Replace the default text with your business greeting:
   ```
   Hello! You've reached [Your Business Name]. 
   I'm your AI assistant. How can I help you today?
   ```
4. Click "Save Changes"
5. ✅ **Checkpoint**: Green success message appears

### Step 3: Set Your Business Hours
1. In the same AI Config section, scroll to "Business Hours"
2. Set your operating hours:
   - Start Time: 09:00
   - End Time: 18:00
   - Select your timezone
   - Choose operating days (Monday-Friday typical)
3. Click "Save Business Hours"
4. ✅ **Checkpoint**: Hours display correctly in the summary

### Step 4: Add Your First Contact
1. Click "Contacts" in the navigation
2. Click the "Add Contact" button
3. Fill in the form:
   - First Name: Your name
   - Last Name: Your surname
   - Phone Number: Your mobile (+1234567890 format)
   - Email: Your email address
   - Check "VIP" box
4. Click "Save Contact"
5. ✅ **Checkpoint**: Contact appears in the contact list with VIP badge

### Step 5: Create Your First Routing Rule
1. Go to "Call Routes" section
2. Click "Add Route"
3. Configure the route:
   - Name: "Owner Direct"
   - Keywords: owner, manager, urgent
   - Action: Forward to Number
   - Forward To: Your phone number
   - Priority: 1
4. Click "Save Route"
5. ✅ **Checkpoint**: Route appears in the routing rules list

### Step 6: Test Your Configuration
1. Go to "Testing" section (if available)
2. Test the AI greeting
3. Test routing rules
4. ✅ **Checkpoint**: All tests pass successfully

**🎉 Congratulations!** Your AI Call Assistant is now configured and ready to handle calls.

---

## Tutorial 2: Mobile Contact Sync (10 minutes)

### For iPhone Users

#### Step 1: Install the Mobile App
1. Open the App Store on your iPhone
2. Search for "AI Call Assistant"
3. Tap "Get" to install
4. Wait for installation to complete
5. ✅ **Checkpoint**: App icon appears on your home screen

#### Step 2: Grant Permissions
1. Open the AI Call Assistant app
2. When prompted for contact access, tap "Allow"
3. If you missed the prompt:
   - Go to Settings > Privacy & Security > Contacts
   - Find "AI Call Assistant" and enable it
4. ✅ **Checkpoint**: App shows "Contact access enabled"

#### Step 3: Sync Your Contacts
1. In the app, tap "Sync Contacts"
2. Review the contact count (e.g., "Found 150 contacts")
3. Tap "Start Sync"
4. Wait for the progress bar to complete
5. ✅ **Checkpoint**: "Sync completed successfully" message appears

#### Step 4: Verify Sync
1. Return to your web dashboard
2. Go to Contacts section
3. Your phone contacts should now appear
4. ✅ **Checkpoint**: Contact count matches your phone

### For Android Users

#### Step 1: Install the Mobile App
1. Open Google Play Store
2. Search for "AI Call Assistant"
3. Tap "Install"
4. Wait for download and installation
5. ✅ **Checkpoint**: App appears in your app drawer

#### Step 2: Grant Permissions
1. Open the app
2. When asked for contact permission, tap "Allow"
3. If needed, go to Settings > Apps > AI Call Assistant > Permissions
4. Enable "Contacts" permission
5. ✅ **Checkpoint**: App confirms contact access

#### Step 3: Sync Contacts
1. Tap "Sync Contacts" in the main menu
2. Review contact summary
3. Tap "Begin Sync"
4. Monitor progress indicator
5. ✅ **Checkpoint**: Success notification appears

### For Web Browser Upload

#### Step 1: Export Contacts from Phone
**iPhone:**
1. Go to iCloud.com > Contacts
2. Select all contacts (Cmd+A or Ctrl+A)
3. Click settings gear > Export vCard
4. Save the .vcf file

**Android:**
1. Open Contacts app
2. Menu > Settings > Export
3. Choose "Export to .vcf file"
4. Save to your device

#### Step 2: Upload to Dashboard
1. In your web dashboard, go to Contacts
2. Click "Import Contacts"
3. Click "Choose File" and select your .vcf file
4. Review the contact preview
5. Click "Import All Contacts"
6. ✅ **Checkpoint**: Contacts appear in your dashboard

---

## Tutorial 3: Advanced Call Routing Setup (20 minutes)

### Step 1: Understanding Routing Priority
Call routing works on a priority system:
- **Priority 1**: Highest priority (checked first)
- **Priority 10**: Lowest priority (checked last)
- **Default**: AI handles the call if no rules match

### Step 2: Create VIP Caller Routing
1. Go to Contacts and select a VIP contact
2. Click "Add Routing Rule"
3. Configure VIP routing:
   - Action: Forward to Number
   - Forward To: Your direct line
   - Priority: 1
   - Business Hours Only: No (24/7 for VIPs)
4. Save the rule
5. ✅ **Checkpoint**: VIP contact shows routing icon

### Step 3: Set Up Department Routing
1. Go to Call Routes > Add Route
2. Create Sales Route:
   - Name: "Sales Inquiries"
   - Keywords: sales, pricing, quote, buy, purchase
   - Action: Forward to Number
   - Forward To: Sales team number
   - Priority: 2
   - Business Hours Only: Yes
3. Create Support Route:
   - Name: "Technical Support"
   - Keywords: help, problem, issue, support, broken
   - Action: Forward to Number
   - Forward To: Support team number
   - Priority: 3
   - Business Hours Only: Yes
4. ✅ **Checkpoint**: Both routes appear in routing list

### Step 4: Configure After-Hours Handling
1. Create After-Hours Route:
   - Name: "After Hours"
   - Keywords: (leave blank for catch-all)
   - Action: AI Handling with custom message
   - Priority: 9
   - Business Hours Only: No
   - Custom Message: "We're currently closed. Please leave a detailed message and we'll call you back during business hours."
2. ✅ **Checkpoint**: After-hours route created

### Step 5: Test Routing Logic
1. Use the call testing feature
2. Test with different keywords:
   - "I need sales information" → Should route to sales
   - "I have a technical problem" → Should route to support
   - "I need the owner" (from VIP) → Should route to you
3. ✅ **Checkpoint**: All routing tests work correctly

---

## Tutorial 4: Notification Setup (15 minutes)

### Step 1: Configure SMS Notifications
1. Go to Settings > Notifications
2. Click "SMS Settings"
3. Enter your mobile number (with country code)
4. Click "Send Verification Code"
5. Enter the code you receive
6. Select notification triggers:
   - ✅ VIP Caller
   - ✅ Missed Calls
   - ✅ New Voicemails
   - ✅ System Alerts
7. Save SMS settings
8. ✅ **Checkpoint**: SMS notifications enabled

### Step 2: Set Up Email Notifications
1. In Notifications settings, click "Email Settings"
2. Verify your email address
3. Choose notification frequency:
   - Immediate for urgent items
   - Daily summary for reports
   - Weekly for analytics
4. Select email triggers:
   - ✅ Call Summaries
   - ✅ Voicemail Transcriptions
   - ✅ Daily Reports
   - ✅ System Updates
5. Save email settings
6. ✅ **Checkpoint**: Test email received

### Step 3: Configure Mobile Push Notifications
1. Open the mobile app
2. Go to Settings > Notifications
3. Enable push notifications
4. Configure notification types:
   - ✅ Incoming Calls
   - ✅ Call Completed
   - ✅ VIP Callers
   - ✅ System Alerts
5. Test notifications
6. ✅ **Checkpoint**: Test notification appears

---

## Tutorial 5: Analytics and Reporting (10 minutes)

### Step 1: Understand Your Dashboard
1. Review the main dashboard metrics:
   - **Calls Today**: Total incoming calls
   - **AI Handled**: Calls managed by AI
   - **Automated**: Calls routed automatically
   - **Voicemails**: Messages left by callers

### Step 2: Generate Your First Report
1. Go to Analytics section
2. Click "Generate Report"
3. Configure report parameters:
   - Date Range: Last 7 days
   - Report Type: Call Summary
   - Include: All call types
4. Click "Generate Report"
5. ✅ **Checkpoint**: Report displays call data

### Step 3: Set Up Automated Reports
1. In Analytics, click "Scheduled Reports"
2. Create Daily Report:
   - Name: "Daily Call Summary"
   - Frequency: Daily at 6 PM
   - Email To: Your email
   - Include: Call stats, top callers, AI performance
3. Create Weekly Report:
   - Name: "Weekly Performance"
   - Frequency: Monday mornings
   - Include: Detailed analytics, trends, recommendations
4. ✅ **Checkpoint**: Scheduled reports configured

---

## Troubleshooting Common Setup Issues

### Issue: Can't See Imported Contacts
**Solution:**
1. Check if contact sync completed (look for success message)
2. Refresh your browser page
3. Verify mobile app permissions
4. Try manual contact import as backup

### Issue: AI Not Answering Calls
**Solution:**
1. Verify your phone number is connected (contact support for Twilio setup)
2. Check AI configuration settings
3. Ensure routing rules aren't blocking calls
4. Test with the built-in testing tools

### Issue: Notifications Not Working
**Solution:**
1. Verify phone number/email in notification settings
2. Check spam/junk folders for emails
3. Ensure mobile app has notification permissions
4. Test each notification channel individually

### Issue: Routing Rules Not Working
**Solution:**
1. Check rule priority order (lower numbers = higher priority)
2. Verify keywords are spelled correctly
3. Test business hours settings
4. Use the testing feature to debug routing

### Getting Help
- **In-App Support**: Click the chat icon for instant help
- **Emergency Support**: For critical call handling issues
- **Documentation**: Complete guides available in the help section
- **Video Tutorials**: Step-by-step visual guides

---

## Quick Reference Checklist

### Initial Setup ✅
- [ ] Dashboard accessible
- [ ] AI greeting customized
- [ ] Business hours configured
- [ ] First contact added
- [ ] Basic routing rule created

### Contact Management ✅
- [ ] Mobile app installed
- [ ] Contact sync completed
- [ ] VIP contacts marked
- [ ] Contact-specific routing configured

### Call Routing ✅
- [ ] Department routing rules
- [ ] VIP caller handling
- [ ] After-hours configuration
- [ ] Routing priorities set
- [ ] Rules tested and verified

### Notifications ✅
- [ ] SMS notifications enabled
- [ ] Email notifications configured
- [ ] Mobile push notifications active
- [ ] Notification preferences set

### Analytics ✅
- [ ] Dashboard metrics understood
- [ ] First report generated
- [ ] Automated reports scheduled
- [ ] Performance monitoring active

**System Status: Ready for Production Use** 🚀