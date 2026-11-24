export const departments = ['Development','Design','QA','HR','Sales'];
export const priorities = ['Low','Medium','High','Critical'];
export const taskStatuses = ['Todo','In Progress','Completed','Cancelled'];
export const employeeStatuses = ['Active','Inactive','On Leave'];
export const dateInput = value => value ? new Date(value).toISOString().slice(0,10) : '';
export const formatDate = value => value ? new Date(value).toLocaleDateString(undefined,{timeZone:'UTC'}) : '—';
export const errorMessage = error => typeof error === 'string' ? error : 'Something went wrong. Please try again.';
