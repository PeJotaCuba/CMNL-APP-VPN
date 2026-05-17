
/**
 * Utility to open WhatsApp or WhatsApp Business in a flexible way.
 * Works on both mobile and desktop.
 */
export const openWhatsApp = (text: string, phone: string = '') => {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone.replace(/\D/g, '');
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const universalUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  if (isMobile) {
    const protocolUrl = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;
    
    // Use intent URL first via an anchor click to break out of iframe safely on mobile
    const a = document.createElement('a');
    a.href = protocolUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Add a backup in case intent URL is not handled
    setTimeout(() => {
        if (document.visibilityState === 'visible') {
            const backupAnchor = document.createElement('a');
            backupAnchor.href = universalUrl;
            backupAnchor.target = '_blank';
            document.body.appendChild(backupAnchor);
            backupAnchor.click();
            document.body.removeChild(backupAnchor);
        }
    }, 1500);
  } else {
    // Desktop: use api.whatsapp.com
    const a = document.createElement('a');
    a.href = universalUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
