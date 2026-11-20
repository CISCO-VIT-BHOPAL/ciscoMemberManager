export const DEMO_MEMBERS = [
  {
    id: 'm1-demo-alex-morgan',
    full_name: 'Alex Morgan',
    email: 'alex.morgan@ciscoclub.org',
    role: 'Club Lead',
    department: 'Engineering',
    qr_token: 'a1b2c3d4e5f6789012345678abcdef01',
    is_active: true,
    created_at: '2024-09-15T10:00:00Z'
  },
  {
    id: 'm2-demo-sarah-chen',
    full_name: 'Sarah Chen',
    email: 'sarah.chen@ciscoclub.org',
    role: 'Tech Lead',
    department: 'Cybersecurity',
    qr_token: 'b2c3d4e5f6789012345678abcdef01a2',
    is_active: true,
    created_at: '2024-10-01T14:30:00Z'
  },
  {
    id: 'm3-demo-david-miller',
    full_name: 'David Miller',
    email: 'david.m@ciscoclub.org',
    role: 'Core Team',
    department: 'Cloud & DevOps',
    qr_token: 'c3d4e5f6789012345678abcdef01a2b3',
    is_active: true,
    created_at: '2024-10-18T09:15:00Z'
  },
  {
    id: 'm4-demo-priya-patel',
    full_name: 'Priya Patel',
    email: 'priya.patel@ciscoclub.org',
    role: 'Event Coordinator',
    department: 'AI & Data Science',
    qr_token: 'd4e5f6789012345678abcdef01a2b3c4',
    is_active: true,
    created_at: '2024-11-05T16:20:00Z'
  },
  {
    id: 'm5-demo-marcus-johnson',
    full_name: 'Marcus Johnson',
    email: 'marcus.j@ciscoclub.org',
    role: 'Member',
    department: 'Networking',
    qr_token: null,
    is_active: true,
    created_at: '2024-11-12T11:45:00Z'
  },
  {
    id: 'm6-demo-elena-rostova',
    full_name: 'Elena Rostova',
    email: 'elena.r@ciscoclub.org',
    role: 'Design Lead',
    department: 'Design',
    qr_token: null,
    is_active: false,
    created_at: '2024-11-14T08:00:00Z'
  }
]

export const DEMO_ATTENDANCE = [
  {
    id: 'att-1',
    member_name: 'Alex Morgan',
    member_role: 'Club Lead',
    scanned_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    notes: 'General Meeting'
  },
  {
    id: 'att-2',
    member_name: 'Sarah Chen',
    member_role: 'Tech Lead',
    scanned_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    notes: 'Zero Trust Security Lab'
  },
  {
    id: 'att-3',
    member_name: 'David Miller',
    member_role: 'Core Team',
    scanned_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    notes: 'Cloud Architecture Workshop'
  },
  {
    id: 'att-4',
    member_name: 'Priya Patel',
    member_role: 'Event Coordinator',
    scanned_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    notes: 'AI Agents Hackathon'
  }
]

export const DEMO_CONTRIBUTIONS = [
  {
    id: 'c-1',
    member_id: 'm1-demo-alex-morgan',
    title: 'Led Cisco DevNet Hands-On Workshop',
    description: 'Designed hands-on exercises in Python and Ansible for 65+ attendees',
    link: 'https://github.com/cisco-devnet',
    created_at: '2024-10-20T10:00:00Z'
  },
  {
    id: 'c-2',
    member_id: 'm1-demo-alex-morgan',
    title: '1st Place Winner - Regional Cybersecurity CTF',
    description: 'Defended enterprise network infrastructure against simulated red-team attacks',
    link: 'https://ctftime.org',
    created_at: '2024-11-02T16:00:00Z'
  }
]
