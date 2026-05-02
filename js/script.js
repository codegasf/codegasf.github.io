// File: js/script.js

document.getElementById('year').textContent = new Date().getFullYear();

// ==========================================
// 1. CONFIG & DATA FETCHING
// ==========================================
async function loadData() {
  try {
    const [configRes, postsRes] = await Promise.all([
      fetch('config/config.json'),
      fetch('config/posts.json')
    ]);
    
    const config = await configRes.json();
    const posts = await postsRes.json();
    
    buildSocialNav(config.socialPlatforms);
    buildSocialPosts(config.featuredSocialPosts);
    buildCodeSnippets(posts);
    
    // Initialize 3D Tilt on newly created elements
    VanillaTilt.init(document.querySelectorAll(".post-card"), {
        max: 10,
        speed: 400,
        glare: true,
        "max-glare": 0.1,
    });

  } catch (error) {
    console.error("Failed to load JSON data:", error);
  }
}

function buildSocialNav(platforms) {
  const nav = document.getElementById('social-nav');
  nav.innerHTML = '';
  for (const [name, url] of Object.entries(platforms)) {
    const a = document.createElement('a');
    a.href = url;
    a.target = "_blank";
    a.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    nav.appendChild(a);
  }
}

function buildSocialPosts(posts) {
  const container = document.getElementById('social-posts-container');
  container.innerHTML = '';
  posts.forEach(post => {
    const el = document.createElement('a');
    el.href = post.link;
    el.target = "_blank";
    el.className = 'post-card';
    el.innerHTML = `
      <div class="platform">${post.icon} ${post.platform}</div>
      <h4>${post.title}</h4>
      <p>${post.description}</p>
    `;
    container.appendChild(el);
  });
}

function buildCodeSnippets(posts) {
  const container = document.getElementById('code-container');
  container.innerHTML = '';
  posts.slice(0, 3).forEach(post => { // Show top 3
    const el = document.createElement('div');
    el.className = 'terminal-card';
    el.innerHTML = `
      <h4>> ${post.title}</h4>
      <pre><code>${post.code}</code></pre>
    `;
    container.appendChild(el);
  });
}

// ==========================================
// 2. THREE.JS 3D BACKGROUND
// ==========================================
function init3DBackground() {
  const canvas = document.getElementById('bg-canvas');
  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Group to hold all objects for mouse interaction
  const particleGroup = new THREE.Group();
  scene.add(particleGroup);

  // Materials
  const materialTech = new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.3 });
  const materialGaming = new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true, transparent: true, opacity: 0.3 });
  const materialSoftware = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.2 });

  // Create floating geometries
  for(let i = 0; i < 50; i++) {
    let geometry, material;
    const type = Math.floor(Math.random() * 3);
    
    if (type === 0) {
      geometry = new THREE.BoxGeometry(2, 2, 2); // Coding (Blocks)
      material = materialTech;
    } else if (type === 1) {
      geometry = new THREE.IcosahedronGeometry(2, 0); // Gaming (Poly)
      material = materialGaming;
    } else {
      geometry = new THREE.TorusGeometry(1.5, 0.5, 8, 20); // Software (Loops)
      material = materialSoftware;
    }

    const mesh = new THREE.Mesh(geometry, material);
    
    // Random positions spread across screen
    mesh.position.x = (Math.random() - 0.5) * 80;
    mesh.position.y = (Math.random() - 0.5) * 80;
    mesh.position.z = (Math.random() - 0.5) * 40;
    
    // Random rotations
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;

    // Custom animation speeds
    mesh.userData = {
      rx: (Math.random() - 0.5) * 0.02,
      ry: (Math.random() - 0.5) * 0.02,
      ryP: (Math.random() - 0.5) * 0.05
    };

    particleGroup.add(mesh);
  }

  // Mouse Interaction Variables
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  const windowHalfX = window.innerWidth / 2;
  const windowHalfY = window.innerHeight / 2;

  document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
  });

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    // Smooth camera pan based on mouse
    particleGroup.rotation.y += 0.05 * (targetX - particleGroup.rotation.y);
    particleGroup.rotation.x += 0.05 * (targetY - particleGroup.rotation.x);

    // Rotate individual shapes
    particleGroup.children.forEach(child => {
      child.rotation.x += child.userData.rx;
      child.rotation.y += child.userData.ry;
      child.position.y += Math.sin(Date.now() * 0.001 * child.userData.ryP) * 0.02; // floating effect
    });

    renderer.render(scene, camera);
  }

  // Handle Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

// Start
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  init3DBackground();
});