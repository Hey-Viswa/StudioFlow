import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { checkSubscriptionHealth } from '../lib/subscriptionUtils';

export default function SubscriptionAlert({ subscription }) {
  const navigate = useNavigate();
  
  const health = checkSubscriptionHealth(subscription);
  
  if (!health.needsAttention) return null;
  
  const getIcon = () => {
    switch (health.severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  const getVariant = () => {
    switch (health.severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };
  
  return (
    <Alert variant={getVariant()} className="mb-4">
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1">
          <AlertTitle>Subscription Alert</AlertTitle>
          <AlertDescription className="mt-1">
            {health.reason}
          </AlertDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/subscription')}
          className="ml-2"
        >
          Manage Subscription
        </Button>
      </div>
    </Alert>
  );
}
