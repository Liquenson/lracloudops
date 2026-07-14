// Hide broken images marked with data-hide-on-error
document.querySelectorAll('img[data-hide-on-error]').forEach((img) => {
  img.addEventListener('error', () => {
    img.style.display = 'none'
  })
})
