import { useLocation } from "wouter";
import { User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactLinkProps {
  contactId?: number;
  contactName?: string;
  phoneNumber?: string;
  className?: string;
  showIcon?: boolean;
  variant?: "text" | "button" | "inline";
}

export function ContactLink({ 
  contactId, 
  contactName, 
  phoneNumber, 
  className = "", 
  showIcon = true,
  variant = "text"
}: ContactLinkProps) {
  const [, setLocation] = useLocation();
  
  const displayName = contactName || phoneNumber || "Unknown";
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (contactId) {
      setLocation(`/contact/${contactId}`);
    }
  };

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className={`rounded-xl ${className}`}
        disabled={!contactId}
      >
        {showIcon && <User className="w-4 h-4 mr-1" />}
        {displayName}
      </Button>
    );
  }

  if (variant === "inline") {
    return (
      <span 
        onClick={handleClick}
        className={`inline-flex items-center text-blue-600 hover:text-blue-800 cursor-pointer font-medium ${className} ${!contactId ? 'cursor-default text-gray-600 hover:text-gray-600' : ''}`}
      >
        {showIcon && <User className="w-3 h-3 mr-1" />}
        {displayName}
      </span>
    );
  }

  // Default text variant
  return (
    <span 
      onClick={handleClick}
      className={`text-blue-600 hover:text-blue-800 cursor-pointer hover:underline ${className} ${!contactId ? 'cursor-default text-gray-600 hover:text-gray-600 hover:no-underline' : ''}`}
    >
      {displayName}
    </span>
  );
}

interface PhoneLinkProps {
  phoneNumber: string;
  contactId?: number;
  contactName?: string;
  className?: string;
  showIcon?: boolean;
  variant?: "text" | "button";
}

export function PhoneLink({ 
  phoneNumber, 
  contactId, 
  contactName,
  className = "", 
  showIcon = true,
  variant = "text"
}: PhoneLinkProps) {
  const [, setLocation] = useLocation();
  
  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (contactId) {
      setLocation(`/contact/${contactId}`);
    }
  };

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleContactClick}
        className={`rounded-xl ${className}`}
        disabled={!contactId}
      >
        {showIcon && <Phone className="w-4 h-4 mr-1" />}
        {contactName || phoneNumber}
      </Button>
    );
  }

  // Default text variant
  return (
    <span className={`flex items-center ${className}`}>
      {showIcon && <Phone className="w-3 h-3 mr-1 text-gray-400" />}
      {contactId ? (
        <span 
          onClick={handleContactClick}
          className="text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
        >
          {contactName || phoneNumber}
        </span>
      ) : (
        <span className="text-gray-600">{phoneNumber}</span>
      )}
    </span>
  );
}