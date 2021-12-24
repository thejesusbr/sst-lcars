function toggleConsole(e) {
  $("#tctCnsCtn > *").addClass("hide");
  switch (e.target.id) {
    case "hlmCnsBtn":
      $("#hlmCnsDsp")[0].classList.toggle("hide");
      break;
    case "shdCnsBtn":
      $("#shdCnsDsp")[0].classList.toggle("hide");
      break;
    case "wpnCnsBtn":
      $("#wpnCnsDsp")[0].classList.toggle("hide");
      break;
    case "navCnsBtn":
      $("#navCnsDsp")[0].classList.toggle("hide");
      break;
    case "engCnsBtn":
      $("#engCnsDsp")[0].classList.toggle("hide");
      break;
  }
}
