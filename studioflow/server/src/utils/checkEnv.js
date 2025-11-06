// Environment variable checker for debugging deployment issues

const checkEnvironmentVariables = () => {
  const requiredEnvVars = {
    'RAZORPAY_KEY_ID': process.env.RAZORPAY_KEY_ID,
    'RAZORPAY_KEY_SECRET': process.env.RAZORPAY_KEY_SECRET,
    'RAZORPAY_PRO_PLAN_ID': process.env.RAZORPAY_PRO_PLAN_ID,
    'RAZORPAY_STUDIO_PLAN_ID': process.env.RAZORPAY_STUDIO_PLAN_ID,
  };

  console.log('\n=== Environment Variables Check ===');
  
  let allPresent = true;
  
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    const isPresent = !!value;
    const displayValue = value ? `${value.substring(0, 10)}...` : 'MISSING';
    
    console.log(`${isPresent ? '✓' : '✗'} ${key}: ${displayValue}`);
    
    if (!isPresent) {
      allPresent = false;
    }
  });
  
  console.log('===================================\n');
  
  return allPresent;
};

module.exports = { checkEnvironmentVariables };
