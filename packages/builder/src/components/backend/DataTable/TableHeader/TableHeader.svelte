<script>
  import { onMount } from "svelte"
  import { Modal, ModalContent } from "@budibase/bbui"
  import CreateEditColumn from "../modals/CreateEditColumn.svelte"

  const SORT_ICON_MAP = {
    asc: "ri-arrow-down-fill",
    desc: "ri-arrow-up-fill",
  }

  export let field
  export let displayName
  export let column
  export let enableSorting = true
  export let showColumnMenu
  export let progressSort
  export let editable

  let menuButton
  let sortDirection = ""
  let modal

  function toggleMenu() {
    showColumnMenu(menuButton)
  }

  function onSort(event) {
    progressSort(event.shiftKey)
  }

  function showModal() {
    modal.show()
  }

  onMount(() => {
    column.addEventListener("sortChanged", () => {
      sortDirection = column.getSort()
    })
  })
</script>

<header on:click={onSort} data-cy="table-header">
  <div>
    <span>{displayName}</span>
    {#if enableSorting && sortDirection}
      <i class={`${SORT_ICON_MAP[sortDirection]} sort-icon`} />
    {/if}
  </div>
  <Modal bind:this={modal}>
    <ModalContent
      showCancelButton={false}
      showConfirmButton={false}
      title={`Edit Column: ${field.name}`}>
      <CreateEditColumn onClosed={modal.hide} {field} />
    </ModalContent>
  </Modal>
  <div>
    {#if editable}
      <span on:click|stopPropagation={showModal}>
        <i class="ri-pencil-line" />
      </span>
    {/if}
    <span on:click|stopPropagation={toggleMenu} bind:this={menuButton}>
      <i class="ri-filter-line" />
    </span>
  </div>
</header>

<style>
  header {
    font-family: Inter;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    height: 100%;
    width: 100%;
    align-items: center;
    color: var(--ink);
  }

  .sort-icon {
    position: relative;
    top: 2px;
  }

  i {
    transition: 0.2s all;
    font-size: var(--font-size-m);
    font-weight: 500;
  }

  i:hover {
    color: var(--blue);
  }

  i:active {
    color: var(--blue);
  }
</style>