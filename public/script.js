const inputs = document.querySelectorAll('#preenchivel');
inputs.forEach((input) => {
  input.addEventListener('input', function() {
    // Remove caracteres que não sejam números
    this.value = this.value    
    .replace(/[^a-zA-Z0-9À-ÿ() /\\]/g, "")
    .slice(0, 50); 
  });  
});
