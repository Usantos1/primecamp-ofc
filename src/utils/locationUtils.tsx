import React, { useState, useEffect } from 'react';

// Utility to convert coordinates to address using OpenStreetMap Nominatim API
export const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch address');
    }
    
    const data = await response.json();
    
    if (data && data.display_name) {
      return data.display_name;
    }
    
    return `${lat}, ${lng}`;
  } catch (error) {
    console.error('Error getting address:', error);
    return `${lat}, ${lng}`;
  }
};

// Component to display location with address lookup
export const LocationDisplay = ({ location }: { location: string }) => {
  const [address, setAddress] = useState<string>(location);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadAddress = async () => {
      if (location && location.includes(',')) {
        const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
        
        if (!isNaN(lat) && !isNaN(lng)) {
          setLoading(true);
          try {
            const addr = await getAddressFromCoordinates(lat, lng);
            setAddress(addr);
          } catch (error) {
            console.error('Failed to load address:', error);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    loadAddress();
  }, [location]);

  if (loading) {
    return <span className="text-muted-foreground">Carregando endereço...</span>;
  }

  return (
    <span className="text-sm" title={location}>
      {address.length > 50 ? `${address.substring(0, 50)}...` : address}
    </span>
  );
};

// Hook version for use in components
export const useLocationAddress = (coordinates: string) => {
  const [address, setAddress] = useState<string>(coordinates);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadAddress = async () => {
      if (coordinates && coordinates.includes(',')) {
        const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
        
        if (!isNaN(lat) && !isNaN(lng)) {
          setLoading(true);
          try {
            const addr = await getAddressFromCoordinates(lat, lng);
            setAddress(addr);
          } catch (error) {
            console.error('Failed to load address:', error);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    loadAddress();
  }, [coordinates]);

  return { address, loading };
};