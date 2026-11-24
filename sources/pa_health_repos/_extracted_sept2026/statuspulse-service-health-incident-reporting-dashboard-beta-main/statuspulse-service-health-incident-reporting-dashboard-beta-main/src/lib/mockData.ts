export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';
export interface Service {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  uptime: string;
}
export interface Incident {
  id: string;
  title: string;
  status: 'resolved' | 'investigating' | 'identified' | 'monitoring';
  severity: 'minor' | 'major' | 'critical';
  timestamp: string;
  updates: { time: string; message: string }[];
}
export const SERVICES_DATA: Service[] = [
  { id: '1', name: 'API Gateway', description: 'Main edge entry point for all requests.', status: 'operational', uptime: '99.99%' },
  { id: '2', name: 'Core Database', description: 'Global PostgreSQL cluster.', status: 'operational', uptime: '99.95%' },
  { id: '3', name: 'Identity Service', description: 'Authentication and authorization.', status: 'degraded', uptime: '98.4%' },
  { id: '4', name: 'Asset CDN', description: 'Global content delivery network.', status: 'operational', uptime: '100%' },
  { id: '5', name: 'Search Engine', description: 'ElasticSearch indexing and search.', status: 'operational', uptime: '99.9%' },
  { id: '6', name: 'Web Dashboard', description: 'Main user interface.', status: 'operational', uptime: '99.98%' },
];
export const INCIDENTS_DATA: Incident[] = [
  {
    id: 'inc-101',
    title: 'Authentication Latency',
    status: 'investigating',
    severity: 'minor',
    timestamp: '2023-10-27T14:30:00Z',
    updates: [
      { time: '14:30', message: 'We are investigating reports of increased latency in login requests.' },
      { time: '14:45', message: 'Issue identified in the primary OIDC provider.' }
    ]
  },
  {
    id: 'inc-100',
    title: 'CDN Cache Purge Issues',
    status: 'resolved',
    severity: 'major',
    timestamp: '2023-10-25T09:00:00Z',
    updates: [
      { time: '09:00', message: 'Cache purge requests are timing out.' },
      { time: '11:20', message: 'Fix deployed. All cache operations are back to normal.' }
    ]
  }
];