import { motion, AnimatePresence } from 'framer-motion';
import '../css/loader.css';

import landscapePhoto from '../assets/landscape.jpg';
import nightPhoto from '../assets/night.jpg';
import cityPhoto from '../assets/city.jpg';
import cameraPhoto from '../assets/camera.jpg';
import sparklePhoto from '../assets/sparkle.jpg';

const PhotoLoader = ({ isLoading }) => {
  const photos = [
    { 
      id: 1, 
      image: landscapePhoto, 
      alt: "Landscape Photography",
      delay: 0, 
      rotation: -5, 
      zIndex: 4,
      category: "Landscape"
    },
    { 
      id: 2, 
      image: nightPhoto, 
      alt: "Night Photography",
      delay: 0.2, 
      rotation: 5, 
      zIndex: 3,
      category: "Night"
    },
    { 
      id: 3, 
      image: cityPhoto, 
      alt: "City Photography",
      delay: 0.4, 
      rotation: -3, 
      zIndex: 2,
      category: "Urban"
    },
    { 
      id: 4, 
      image: cameraPhoto, 
      alt: "Camera Equipment",
      delay: 0.6, 
      rotation: 3, 
      zIndex: 1,
      category: "Equipment"
    },
    { 
      id: 5, 
      image: sparklePhoto, 
      alt: "Creative Photography",
      delay: 0.8, 
      rotation: 0, 
      zIndex: 5,
      category: "Creative"
    }
  ];

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div 
          className="photo-loader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: "easeInOut" }
          }}
        >
          <div className="loader-background"></div>
          
          {/* Photography Overlay Pattern */}
          <div className="photography-pattern">
            <div className="pattern-grid">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="pattern-cell"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.05, scale: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                />
              ))}
            </div>
          </div>

          {/* Overlapping Photos */}
          <div className="photos-stack">
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                className="photo-item"
                style={{ 
                  zIndex: photo.zIndex,
                  transform: `rotate(${photo.rotation}deg)`
                }}
                initial={{ 
                  opacity: 0, 
                  scale: 0.8, 
                  y: 50,
                  rotate: photo.rotation - 15 
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  rotate: photo.rotation 
                }}
                transition={{
                  delay: photo.delay,
                  duration: 0.6,
                  ease: "backOut"
                }}
                exit={{
                  opacity: 0,
                  scale: 1.2,
                  rotate: photo.rotation + 45,
                  transition: { duration: 0.5 }
                }}
              >
                <div className="photo-frame">
                  <img 
                    src={photo.image} 
                    alt={photo.alt}
                    className="photo-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `
                        <div class="photo-fallback" style="background: linear-gradient(135deg, var(--loader-color-${photo.id}), #1a1f35)">
                          <div class="fallback-icon">📸</div>
                          <div class="fallback-category">${photo.category}</div>
                        </div>
                      `;
                    }}
                  />
                  <div className="photo-category">{photo.category}</div>
                  <div className="photo-reflections"></div>
                  <div className="photo-glow"></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Loading Text */}
          <motion.div 
            className="loader-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <div className="loader-title">
              <span className="loader-title-text">Lens</span>
              <span className="loader-title-highlight">IQ</span>
            </div>
            <h3>Photography Location Intelligence</h3>
            <div className="loading-progress">
              <motion.div 
                className="progress-bar"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
              />
            </div>
           
            <p className="loader-quote">
              "The right location transforms good photos into masterpieces"
            </p>
          </motion.div>

          <div className="shutter-overlay"></div>

          {/* Loading Percentage */}
          <motion.div 
            className="loading-percentage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.span
              initial={{ number: 0 }}
              animate={{ number: 100 }}
              transition={{ duration: 3.5, ease: "easeInOut" }}
            >
              {({ number }) => `${Math.floor(number)}%`}
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PhotoLoader;