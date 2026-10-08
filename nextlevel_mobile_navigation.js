(function(){
 'use strict';
 function mount(){
  var nav=document.querySelector('.tab-bar,.tabs');if(!nav)return;
  var wrap=document.createElement('div');wrap.className='nextlevel-nav-wrap';nav.parentNode.insertBefore(wrap,nav);wrap.appendChild(nav);
  function edge(){wrap.classList.toggle('at-end',nav.scrollLeft+nav.clientWidth>=nav.scrollWidth-3);}
  function reveal(){if(!window.matchMedia('(max-width:640px)').matches)return;var active=nav.querySelector('.on,.active');if(active){var a=active.getBoundingClientRect(),n=nav.getBoundingClientRect();if(a.left<n.left||a.right>n.right-22)nav.scrollTo({left:Math.max(0,nav.scrollLeft+a.left-n.left-(nav.clientWidth-a.width)/2),behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}edge();}
  nav.addEventListener('scroll',edge,{passive:true});window.addEventListener('resize',reveal);
  new MutationObserver(reveal).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});reveal();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
